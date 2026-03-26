const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { body, validationResult } = require('express-validator');
const { loginLimiter, registerLimiter } = require('../middleware/security');
const { verifyToken } = require('../middleware/auth');

// Validation helpers
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// User Registration with enhanced security
router.post('/register', registerLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
  // Allow public registration for students and teachers. Agents must use /register/agent with signup code.
  body('role').isIn(['student', 'teacher']),
  body('specialty_id').isInt().toInt(),
  body('filiere').optional().trim(),
  body('level').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const { email, password, first_name, last_name, role, specialty_id, filiere, level } = req.body;

    // Additional validation
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!specialty_id) {
      return res.status(400).json({ error: 'Specialty selection is required' });
    }

    // Verify specialty exists
    const specialtyCheck = await pool.query(
      'SELECT id FROM specialties WHERE id = $1',
      [specialty_id]
    );

    if (specialtyCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Selected specialty does not exist' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password with higher salt rounds for security
    const hashedPassword = await bcrypt.hash(password, 12);

    // Use transaction for data consistency
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user
      const result = await client.query(
        'INSERT INTO users (email, password, first_name, last_name, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email, role, first_name, last_name',
        [email.toLowerCase(), hashedPassword, first_name, last_name, role]
      );

      const userId = result.rows[0].id;

      // Create role-specific record
      if (role === 'student') {
        // Generate student ID in format STU + sequential number
        const studentIdResult = await client.query(
          'SELECT COUNT(*) + 1 as count FROM students'
        );
        const studentCount = studentIdResult.rows[0].count;
        const studentId = `STU${studentCount}`;

        await client.query(
          'INSERT INTO students (user_id, student_id, filiere, level, semester, specialty_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, studentId, filiere || 'General', level || '1st Year', 1, specialty_id]
        );
      } else if (role === 'teacher') {
        // Generate teacher ID in format TEA + count
        const teacherIdResult = await client.query(
          'SELECT COUNT(*) + 1 as count FROM teachers'
        );
        const teacherCount = teacherIdResult.rows[0].count;
        const teacherId = `TEA${teacherCount}`;

        await client.query(
          'INSERT INTO teachers (user_id, teacher_id, specialty_id) VALUES ($1, $2, $3)',
          [userId, teacherId, specialty_id]
        );
      }

      await client.query('COMMIT');

      // Generate JWT token
      const token = jwt.sign(
        { id: userId, email: email.toLowerCase(), role: role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({ 
        message: 'Account created successfully',
        token,
        user: result.rows[0],
        expiresIn: '7d'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Agent Registration with Signup Code Verification
router.post('/register/agent', registerLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('signup_code').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const { email, password, signup_code } = req.body;

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify signup code exists, is valid, and matches the email
    const codeResult = await pool.query(
      `SELECT id, email, signup_code, agent_id, expires_at, used_at 
       FROM agent_signup_codes 
       WHERE LOWER(email) = LOWER($1) AND signup_code = $2`,
      [email, signup_code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or signup code' });
    }

    const codeRecord = codeResult.rows[0];

    // Check if code has expired
    if (new Date() > new Date(codeRecord.expires_at)) {
      return res.status(401).json({ error: 'Signup code has expired' });
    }

    // Check if code has already been used
    if (codeRecord.used_at !== null) {
      return res.status(401).json({ error: 'Signup code has already been used' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Use transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user
      const userRes = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email, role`,
        [email.toLowerCase(), hashedPassword, 'Agent', 'User', 'agent']
      );

      const userId = userRes.rows[0].id;
      const agentId = codeRecord.agent_id;

      // Create agent record
      const agentRes = await client.query(
        `INSERT INTO agents(user_id, agent_id, department) 
         VALUES($1, $2, $3) RETURNING id`,
        [userId, agentId, 'Pedagogical']
      );

      // Mark signup code as used
      await client.query(
        `UPDATE agent_signup_codes 
         SET used_at = NOW(), used_by_user_id = $1 
         WHERE id = $2`,
        [userId, codeRecord.id]
      );

      await client.query('COMMIT');

      // Generate JWT token
      const token = jwt.sign(
        { id: userId, email: email.toLowerCase(), role: 'agent' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Agent account created successfully',
        token,
        user: { id: userId, email, role: 'agent' },
        expiresIn: '7d'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Agent registration error:', err);
    res.status(500).json({ error: 'Server error during agent registration' });
  }
});

// Teacher Registration with Signup Code Verification
router.post('/register/teacher', registerLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('signup_code').trim().notEmpty(),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const { email, password, signup_code, first_name, last_name } = req.body;

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify signup code exists, is valid, and matches the email
    const codeResult = await pool.query(
      `SELECT id, email, signup_code, specialty_id, teacher_id, expires_at, used_at, created_by_agent_id 
       FROM teacher_signup_codes 
       WHERE LOWER(email) = LOWER($1) AND signup_code = $2`,
      [email, signup_code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or signup code' });
    }

    const codeRecord = codeResult.rows[0];

    // Check if code has expired
    if (new Date() > new Date(codeRecord.expires_at)) {
      return res.status(401).json({ error: 'Signup code has expired' });
    }

    // Check if code has already been used
    if (codeRecord.used_at !== null) {
      return res.status(401).json({ error: 'Signup code has already been used' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Use transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user
      const userRes = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, role, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email, role`,
        [email.toLowerCase(), hashedPassword, first_name, last_name, 'teacher']
      );

      const userId = userRes.rows[0].id;
      const teacherId = codeRecord.teacher_id;
      const specialtyId = codeRecord.specialty_id;
      const createdByAgentId = codeRecord.created_by_agent_id || null;

      // Create teacher record with specialty and assign to responsible agent (if any)
      await client.query(
        `INSERT INTO teachers(user_id, teacher_id, specialty_id, agent_id) 
         VALUES($1, $2, $3, $4)`,
        [userId, teacherId, specialtyId, createdByAgentId]
      );

      // Mark signup code as used
      await client.query(
        `UPDATE teacher_signup_codes 
         SET used_at = NOW(), used_by_user_id = $1 
         WHERE id = $2`,
        [userId, codeRecord.id]
      );

      await client.query('COMMIT');

      // Generate JWT token
      const token = jwt.sign(
        { id: userId, email: email.toLowerCase(), role: 'teacher' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Teacher account created successfully',
        token,
        user: { id: userId, email, role: 'teacher', first_name, last_name },
        expiresIn: '7d'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Teacher registration error:', err.message, err.stack);
    res.status(500).json({ error: 'Server error during teacher registration: ' + err.message });
  }
});

// User Login with enhanced security
router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  try {
    const { email, password } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Query user
    const result = await pool.query(
      'SELECT id, email, password, role, first_name, last_name FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (result.rows.length === 0) {
      // Don't reveal if email exists for security
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    
    // Compare password with bcrypt
    let validPassword = false;
    try {
      // Try bcrypt compare first (normal case)
      validPassword = await bcrypt.compare(password, user.password);
    } catch (cmpErr) {
      // bcrypt.compare can throw if stored value isn't a hash; fall back to legacy check below
      console.warn('bcrypt compare error, falling back to legacy check');
      validPassword = false;
    }

    // If bcrypt compare failed (e.g., stored password is legacy/plaintext), allow legacy equality check
    if (!validPassword) {
      if (typeof user.password === 'string' && user.password === password) {
        validPassword = true;
        // Migrate plaintext password to bcrypt hash for security
        try {
          const newHash = await bcrypt.hash(password, 12);
          await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
          console.log(`Migrated legacy password to bcrypt for user id ${user.id}`);
        } catch (migrateErr) {
          console.error('Password migration failed for user', user.id, migrateErr);
        }
      }
    }

    if (!validPassword) {
      // Log failed attempt for security monitoring
      console.warn(`Failed login attempt for email: ${email} at ${new Date().toISOString()}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token with additional claims
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful login
    console.log(`Successful login for user: ${email} at ${new Date().toISOString()}`);

    // Set httpOnly cookie for token (safer than localStorage)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    if (process.env.COOKIE_DOMAIN) cookieOptions.domain = process.env.COOKIE_DOMAIN;

    res.cookie('token', token, cookieOptions);

    res.json({
      message: 'Login successful',
      token, // kept for backwards compatibility; clients should prefer cookie
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      },
      expiresIn: '7d'
    });
  } catch (err) {
    console.error('Login error:', err.message || err);
    
    // Provide specific error messages for debugging
    if (err.message && err.message.includes('column')) {
      // Database schema issue - log it
      console.error('Database column error - check schema matches code expectations', err);
      res.status(500).json({ error: 'Invalid email or password' });
    } else if (err.message && err.message.includes('connect')) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
    } else {
      res.status(500).json({ error: 'Invalid email or password' });
    }
  }
});

// Change password endpoint
router.post('/change-password', verifyToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input data' });
  }

  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRow = userResult.rows[0];

    // Verify current password (bcrypt)
    const validCurrent = await bcrypt.compare(currentPassword, userRow.password);
    if (!validCurrent) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    console.log(`Password changed for user: ${userId}`);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error during password change' });
  }
});

// Forgot Password - Generate reset token
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const { email } = req.body;

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists for security
      return res.status(200).json({ 
        message: 'If an account exists with that email, a reset link will be sent.' 
      });
    }

    const user = userResult.rows[0];

    // Generate unique reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    // Store reset token
    await pool.query(
      `INSERT INTO password_reset_tokens(user_id, token, expires_at) 
       VALUES($1, $2, $3)`,
      [user.id, resetToken, expiresAt]
    );

    // In production, here you would send an email with the reset link
    // For now, return the token (in development) or just a message
    const response = {
      message: 'Password reset token generated',
      user_email: user.email
    };

    if (process.env.NODE_ENV !== 'production') {
      // In development, include the token for testing
      response.reset_token = resetToken;
      response.expires_at = expiresAt;
    } else {
      // In production, tell user to check email
      response.message = 'If an account exists with that email, a password reset link has been sent.';
    }

    res.json(response);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error during password reset request' });
  }
});

// Reset Password - Validate token and set new password
router.post('/reset-password', [
  body('token').trim().notEmpty(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid token or password' });
  }

  try {
    const { token, password } = req.body;

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find valid reset token
    const tokenResult = await pool.query(
      `SELECT id, user_id, expires_at, used_at 
       FROM password_reset_tokens 
       WHERE token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    const tokenRecord = tokenResult.rows[0];

    // Check if token has expired
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(401).json({ error: 'Reset token has expired' });
    }

    // Check if token has already been used
    if (tokenRecord.used_at !== null) {
      return res.status(401).json({ error: 'Reset token has already been used' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Use transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user password
      await client.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, tokenRecord.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [tokenRecord.id]
      );

      await client.query('COMMIT');

      res.json({ message: 'Password has been reset successfully. Please login with your new password.' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// Logout endpoint (for audit purposes)
router.post('/logout', verifyToken, (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`User ${userId} logged out at ${new Date().toISOString()}`);

    // Clear the auth cookie (match options to ensure proper removal)
    const clearOptions = { httpOnly: true };
    if (process.env.NODE_ENV === 'production') {
      clearOptions.secure = true;
      clearOptions.sameSite = 'Strict';
      if (process.env.COOKIE_DOMAIN) clearOptions.domain = process.env.COOKIE_DOMAIN;
    }
    res.clearCookie('token', clearOptions);

    res.json({ 
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Public endpoint to get all specialties for registration
router.get('/specialties', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.name, f.name as faculty_name, f.id as faculty_id
      FROM specialties s
      JOIN faculties f ON s.faculty_id = f.id
      ORDER BY f.name, s.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching specialties:', err);
    res.status(500).json({ error: 'Failed to fetch specialties' });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let profileQuery;
    let profileParams = [userId];

    switch (userRole) {
      case 'student':
        profileQuery = `
          SELECT u.id, u.email, u.role, u.first_name, u.last_name, s.student_id, s.filiere, s.level, s.semester
          FROM users u
          JOIN students s ON u.id = s.user_id
          WHERE u.id = $1`;
        break;
      case 'teacher':
        profileQuery = `
          SELECT u.id, u.email, u.role, u.first_name, u.last_name, t.teacher_id, t.department, t.specialization, t.office_location
          FROM users u
          JOIN teachers t ON u.id = t.user_id
          WHERE u.id = $1`;
        break;
      case 'agent':
        profileQuery = `
          SELECT u.id, u.email, u.role, u.first_name, u.last_name, a.agent_id, a.department
          FROM users u
          JOIN agents a ON u.id = a.user_id
          WHERE u.id = $1`;
        break;
      case 'admin':
        profileQuery = `
          SELECT id, email, role, first_name, last_name
          FROM users
          WHERE id = $1 AND role = 'admin'`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid user role' });
    }

    const result = await pool.query(profileQuery, profileParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error while fetching profile' });
  }
});

module.exports = router;
