const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Get all student accounts (Agent only)
router.get('/all', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, s.student_id, 
             s.filiere, s.level, s.semester, s.total_credits
      FROM users u
      JOIN students s ON u.id = s.user_id
      WHERE u.role = 'student'
      ORDER BY u.last_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student info (Agent only)
router.put('/update/:studentId', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { filiere, level, semester } = req.body;
    const result = await pool.query(`
      UPDATE students 
      SET filiere = $1, level = $2, semester = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [filiere, level, semester, req.params.studentId]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student grades and academic summary
router.get('/:studentId/academic-summary', verifyToken, async (req, res) => {
  try {
    const gradesResult = await pool.query(`
      SELECT g.*, c.course_name, c.credits
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      JOIN students s ON g.student_id = s.id
      WHERE s.id = $1
    `, [req.params.studentId]);

    const studentResult = await pool.query(`
      SELECT total_credits
      FROM students
      WHERE id = $1
    `, [req.params.studentId]);

    const grades = gradesResult.rows;
    const totalCredits = studentResult.rows[0]?.total_credits || 0;
    const avgGrade = grades.length > 0 
      ? (grades.reduce((sum, g) => sum + (g.final_grade || 0), 0) / grades.length).toFixed(2)
      : 0;

    res.json({
      grades,
      summary: {
        totalCredits,
        averageGrade: avgGrade,
        coursesCount: grades.length,
        passedCourses: grades.filter(g => g.final_grade >= 10).length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enroll student in course (Agent only)
router.post('/enroll', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { student_id, course_id } = req.body;
    
    const result = await pool.query(`
      INSERT INTO enrollments (student_id, course_id)
      VALUES ($1, $2)
      ON CONFLICT (student_id, course_id) DO NOTHING
      RETURNING *
    `, [student_id, course_id]);

    res.status(201).json({ 
      message: 'Student enrolled successfully',
      enrollment: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent can send announcements (broadcast to students or per-course)
router.post('/announcement', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { course_id, title, content, broadcast_all } = req.body;

    // If broadcast_all is true, use target_audience 'students' and null course_id
    const targetCourse = broadcast_all ? null : course_id || null;

    const result = await pool.query(`
      INSERT INTO announcements (author_id, title, content, target_audience, course_id)
      VALUES ($1, $2, $3, 'students', $4)
      RETURNING *
    `, [req.user.id, title, content, targetCourse]);

    // Emit real-time announcement to connected clients
    try {
      const io = req.app.get('io');
      if (io) io.emit('announcement', result.rows[0]);
    } catch (e) {
      console.error('Socket emit error (announcement):', e.message);
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Structure endpoints (Universities / Faculties / Specialties) ----
// Get universities
router.get('/structure/universities', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM universities ORDER BY name`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create university
router.post('/structure/universities', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { name } = req.body;
    const existing = await pool.query(`SELECT id FROM universities WHERE name = $1`, [name]);
    if (existing.rowCount > 0) return res.status(409).json({ error: 'University already exists' });
    const r = await pool.query(`INSERT INTO universities(name) VALUES($1) RETURNING *`, [name]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get faculties by university
router.get('/structure/faculties', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { university_id } = req.query;
    const q = university_id ? `WHERE university_id = $1` : '';
    const params = university_id ? [university_id] : [];
    const result = await pool.query(`SELECT * FROM faculties ${q} ORDER BY name`, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create faculty
router.post('/structure/faculties', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { university_id, name } = req.body;
    const existing = await pool.query(`SELECT id FROM faculties WHERE university_id = $1 AND name = $2`, [university_id, name]);
    if (existing.rowCount > 0) return res.status(409).json({ error: 'Faculty already exists for this university' });
    const r = await pool.query(`INSERT INTO faculties(university_id, name) VALUES($1,$2) RETURNING *`, [university_id, name]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specialties by faculty
router.get('/structure/specialties', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { faculty_id } = req.query;
    const q = faculty_id ? `WHERE faculty_id = $1` : '';
    const params = faculty_id ? [faculty_id] : [];
    const result = await pool.query(`SELECT * FROM specialties ${q} ORDER BY name`, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create specialty
router.post('/structure/specialties', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { faculty_id, name, degree_system } = req.body;
    const existing = await pool.query(`SELECT id FROM specialties WHERE faculty_id = $1 AND name = $2`, [faculty_id, name]);
    if (existing.rowCount > 0) return res.status(409).json({ error: 'Specialty already exists for this faculty' });
    const r = await pool.query(`INSERT INTO specialties(faculty_id, name, degree_system) VALUES($1,$2,$3) RETURNING *`, [faculty_id, name, degree_system || 'LMD']);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Assign / Create Pedagogical Agent for a Specialty ----
router.post('/specialties/:id/agent', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const specialtyId = req.params.id;
    // Check specialty
    const spec = await pool.query(`SELECT * FROM specialties WHERE id = $1`, [specialtyId]);
    if (spec.rowCount === 0) return res.status(404).json({ error: 'Specialty not found' });

    // Check if an agent already exists for this specialty
    const existing = await pool.query(`SELECT sa.id, a.id as agent_db_id, u.email, u.first_name, u.last_name FROM specialty_agents sa JOIN agents a ON sa.agent_id = a.id JOIN users u ON a.user_id = u.id WHERE sa.specialty_id = $1`, [specialtyId]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'An agent already exists for this specialty', agent: existing.rows[0] });
    }

    // Only a principal agent may create other agent accounts
    const currentAgent = await pool.query(`SELECT permissions FROM agents WHERE user_id = $1`, [req.user.id]);
    if (currentAgent.rowCount === 0 || currentAgent.rows[0].permissions !== 'principal') {
      return res.status(403).json({ error: 'Only principal agent may create agent accounts' });
    }

    // Create signup record + agent
    const { first_name, last_name, email } = req.body;
    
    // Check if user already exists
    const ue = await pool.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (ue.rowCount > 0) return res.status(409).json({ error: 'Email already registered as a user account' });

    // Generate unique signup code (format: AGENT-24CHARCODE)
    const signupCode = 'AGENT-' + require('crypto').randomBytes(12).toString('hex').toUpperCase();
    const agentId = 'AG-' + (Math.floor(Math.random() * 900) + 100);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Delete existing signup code for this email (if any) and create new one
    // This allows principal to regenerate codes if needed
    await pool.query(
      `DELETE FROM agent_signup_codes WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    // Create signup code entry (user will **not** be created yet)
    await pool.query(
      `INSERT INTO agent_signup_codes(email, signup_code, agent_id, expires_at) VALUES($1,$2,$3,$4)`,
      [email, signupCode, agentId, expiresAt]
    );

    // Return signup code and agent_id (principal will provide these to the new agent)
    res.status(201).json({ 
      email, 
      signup_code: signupCode,
      agent_id: agentId,
      message: 'Agent signup code created. Share email, signup_code, and these credentials with the new agent.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Teacher Signup Code (principal agent creates teachers for specialties)
router.post('/specialties/:specialtyId/teacher', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const specialtyId = req.params.specialtyId;

    // Check specialty exists
    const spec = await pool.query(`SELECT * FROM specialties WHERE id = $1`, [specialtyId]);
    if (spec.rowCount === 0) return res.status(404).json({ error: 'Specialty not found' });

    // Verify principal agent permission
    const currentAgent = await pool.query(`SELECT permissions FROM agents WHERE user_id = $1`, [req.user.id]);
    if (currentAgent.rowCount === 0 || currentAgent.rows[0].permissions !== 'principal') {
      return res.status(403).json({ error: 'Only principal agent may create teacher accounts' });
    }

    const { first_name, last_name, email } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Check if user already exists
    const ue = await pool.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (ue.rowCount > 0) return res.status(409).json({ error: 'Email already registered as a user account' });

    // Generate unique signup code (format: TEACHER-24CHARCODE)
    const signupCode = 'TEACHER-' + require('crypto').randomBytes(12).toString('hex').toUpperCase();
    // Generate unique teacher_id with timestamp and random suffix to ensure uniqueness
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const teacherId = `TEA-${timestamp}-${randomSuffix}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Delete existing signup code for this email+specialty combo (if any) to allow regeneration
    await pool.query(
      `DELETE FROM teacher_signup_codes WHERE LOWER(email) = LOWER($1) AND specialty_id = $2`,
      [email, specialtyId]
    );

    // Create signup code entry
    // Determine which agent is responsible for this specialty (if any)
    const specialtyAgentRes = await pool.query(`SELECT agent_id FROM specialty_agents WHERE specialty_id = $1`, [specialtyId]);
    const responsibleAgentId = specialtyAgentRes.rows[0] ? specialtyAgentRes.rows[0].agent_id : null;

    const codeResult = await pool.query(
      `INSERT INTO teacher_signup_codes(email, signup_code, specialty_id, teacher_id, expires_at, created_by_agent_id) 
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [email, signupCode, specialtyId, teacherId, expiresAt, responsibleAgentId]
    );

    if (codeResult.rowCount === 0) {
      return res.status(500).json({ error: 'Failed to create signup code' });
    }

    // Return signup code
    res.status(201).json({ 
      email, 
      signup_code: signupCode,
      teacher_id: teacherId,
      message: 'Teacher signup code created. Share email and signup_code with the new teacher.'
    });
  } catch (err) {
    console.error('Teacher creation error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to create teacher signup code: ' + err.message });
  }
});

// Get current agent record (permissions etc.)
router.get('/me', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id as agent_id, a.agent_id as agent_code, a.department, a.permissions, u.email, u.first_name, u.last_name
      FROM agents a
      JOIN users u ON a.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rowCount === 0) return res.status(404).json({ error: 'Agent record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get teachers owned by the logged-in agent
router.get('/me/teachers', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    // Resolve agent DB id for current user
    const agentRes = await pool.query(`SELECT id FROM agents WHERE user_id = $1`, [req.user.id]);
    if (agentRes.rowCount === 0) return res.status(404).json({ error: 'Agent record not found' });
    const agentDbId = agentRes.rows[0].id;

    const result = await pool.query(
      `SELECT t.id, t.teacher_id, u.email, u.first_name, u.last_name, t.specialization, t.department, t.specialty_id
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.agent_id = $1
       ORDER BY u.last_name`,
      [agentDbId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get students for specialties owned by the logged-in agent
router.get('/me/students', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    // Resolve agent DB id for current user
    const agentRes = await pool.query(`SELECT id FROM agents WHERE user_id = $1`, [req.user.id]);
    if (agentRes.rowCount === 0) return res.status(404).json({ error: 'Agent record not found' });
    const agentDbId = agentRes.rows[0].id;

    // Get specialties this agent is responsible for
    const specsRes = await pool.query(`SELECT specialty_id FROM specialty_agents WHERE agent_id = $1`, [agentDbId]);
    const specialtyIds = specsRes.rows.map(r => r.specialty_id);
    if (specialtyIds.length === 0) return res.json([]);

    const result = await pool.query(
      `SELECT s.id, s.student_id, u.email, u.first_name, u.last_name, s.filiere, s.level, s.semester, s.specialty_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.specialty_id = ANY($1::int[])
       ORDER BY u.last_name`,
      [specialtyIds]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ========== SEMESTERS & MODULES ==========

// Get semesters for a specialty
router.get('/specialties/:specialtyId/semesters', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, specialty_id, number FROM semesters WHERE specialty_id = $1 ORDER BY number`,
      [req.params.specialtyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create semester
router.post('/specialties/:specialtyId/semesters', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Semester number required' });
    
    const result = await pool.query(
      `INSERT INTO semesters(specialty_id, number) VALUES($1, $2) RETURNING *`,
      [req.params.specialtyId, number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.constraint === 'semesters_specialty_id_number_key') {
      res.status(409).json({ error: 'Semester already exists for this specialty' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Get modules for a semester
router.get('/semesters/:semesterId/modules', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, semester_id, module_name, coefficient, module_type FROM module_coefficients WHERE semester_id = $1 ORDER BY module_name`,
      [req.params.semesterId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create module
router.post('/semesters/:semesterId/modules', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { module_name, coefficient, module_type } = req.body;
    if (!module_name || !module_type) return res.status(400).json({ error: 'Module name and type required' });
    
    const result = await pool.query(
      `INSERT INTO module_coefficients(semester_id, module_name, coefficient, module_type) 
       VALUES($1, $2, $3, $4) RETURNING *`,
      [req.params.semesterId, module_name, coefficient || 1, module_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== TEACHERS MANAGEMENT ==========

// Create teacher
router.post('/teachers/create', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { first_name, last_name, email, specialization, department } = req.body;
    if (!first_name || !last_name || !email) return res.status(400).json({ error: 'Required fields missing' });
    
    // Check if email exists
    const existingUser = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Generate password
    const password = uuidv4().slice(0, 8) + Math.random().toString(36).substring(2, 8);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userRes = await pool.query(
      `INSERT INTO users(email, password, first_name, last_name, role) VALUES($1, $2, $3, $4, $5) RETURNING id`,
      [email, hashedPassword, first_name, last_name, 'teacher']
    );
    
    const teacher_id = `T${Date.now().toString(36).toUpperCase()}`;
    
    // Create teacher record
    const teacherRes = await pool.query(
      `INSERT INTO teachers(user_id, teacher_id, department, specialization) VALUES($1, $2, $3, $4) RETURNING id`,
      [userRes.rows[0].id, teacher_id, department, specialization]
    );
    
    res.status(201).json({
      teacher_id: teacherRes.rows[0].id,
      email,
      password,
      first_name,
      last_name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all teachers
router.get('/teachers/list', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.teacher_id, u.email, u.first_name, u.last_name, t.specialization, t.department
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       ORDER BY u.last_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign teacher to module
router.post('/modules/:moduleId/assign-teacher', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { teacher_id } = req.body;
    if (!teacher_id) return res.status(400).json({ error: 'Teacher ID required' });
    // Verify module exists
    const modRes = await pool.query(`SELECT id, semester_id, module_name FROM module_coefficients WHERE id = $1`, [req.params.moduleId]);
    if (modRes.rowCount === 0) return res.status(404).json({ error: 'Module not found' });
    const module = modRes.rows[0];

    // Ensure teacher exists
    const teacherRes = await pool.query(`SELECT id FROM teachers WHERE id = $1`, [teacher_id]);
    if (teacherRes.rowCount === 0) return res.status(404).json({ error: 'Teacher not found' });

    // Create or update a course record representing this module and assign the teacher
    const courseCode = `MODULE-${module.id}`;
    const courseName = module.module_name || `Module ${module.id}`;

    const courseRes = await pool.query(`
      INSERT INTO courses (course_code, course_name, teacher_id, course_type, credits)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (course_code) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
      RETURNING *
    `, [courseCode, courseName, teacher_id, 'CM', 3]);

    res.json({ success: true, course: courseRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== GROUPS MANAGEMENT ==========

// Create groups for specialty (auto-distribute students)
router.post('/specialties/:specialtyId/create-groups', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { group_size } = req.body;
    const STUDENTS_PER_GROUP = group_size || 50;
    
    // Resolve specialty name and get all students for this specialty (ordered alphabetically by name)
    const specNameRes = await pool.query(`SELECT name FROM specialties WHERE id = $1`, [req.params.specialtyId]);
    if (specNameRes.rowCount === 0) return res.status(404).json({ error: 'Specialty not found' });
    const specialtyName = specNameRes.rows[0].name;

    const studentsRes = await pool.query(
      `SELECT s.id FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.filiere = $1
       ORDER BY u.last_name, u.first_name
       LIMIT 10000`,
      [specialtyName]
    );
    
    const students = studentsRes.rows;
    const groups = [];
    
    for (let i = 0; i < students.length; i += STUDENTS_PER_GROUP) {
      const groupIndex = Math.floor(i / STUDENTS_PER_GROUP) + 1;
      
      // Create group
      const groupRes = await pool.query(
        `INSERT INTO groups(specialty_id, name, group_index) 
         VALUES($1, $2, $3) RETURNING id`,
        [req.params.specialtyId, `Group ${groupIndex}`, groupIndex]
      );
      
      const groupId = groupRes.rows[0].id;
      
      // Add students to group
      const batchStudents = students.slice(i, i + STUDENTS_PER_GROUP);
      for (const student of batchStudents) {
        await pool.query(
          `INSERT INTO group_students(group_id, student_id) VALUES($1, $2)`,
          [groupId, student.id]
        );
      }
      
      groups.push({
        id: groupId,
        index: groupIndex,
        student_count: batchStudents.length
      });
    }
    
    res.status(201).json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get groups for specialty
router.get('/specialties/:specialtyId/groups', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.id, g.name, g.group_index, COUNT(gs.student_id) as student_count
       FROM groups g
       LEFT JOIN group_students gs ON g.id = gs.group_id
       WHERE g.specialty_id = $1
       GROUP BY g.id, g.name, g.group_index
       ORDER BY g.group_index`,
      [req.params.specialtyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get students in group
router.get('/groups/:groupId/students', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, u.first_name, u.last_name, s.student_id
       FROM group_students gs
       JOIN students s ON gs.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE gs.group_id = $1
       ORDER BY u.last_name`,
      [req.params.groupId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});// ========== ROOMS MANAGEMENT ==========

// Get all rooms
router.get('/rooms/list', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, capacity FROM rooms ORDER BY name`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create room
router.post('/rooms/create', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { name, capacity } = req.body;
    if (!name) return res.status(400).json({ error: 'Room name required' });
    
    const result = await pool.query(
      `INSERT INTO rooms(name, capacity) VALUES($1, $2) RETURNING *`,
      [name, capacity || 30]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.constraint === 'rooms_name_key') {
      res.status(409).json({ error: 'Room already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ========== SCHEDULE/EDT MANAGEMENT ==========

// Get schedule for group
router.get('/groups/:groupId/schedule', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.day_of_week, s.start_time, s.end_time, s.classroom, 
             m.module_name, m.module_type, t.first_name, t.last_name
      FROM schedule s
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN module_coefficients m ON c.course_code = m.module_name
      LEFT JOIN teachers t ON c.teacher_id = t.id
      WHERE s.group_number = (SELECT group_index FROM groups WHERE id = $1)
      ORDER BY array_position(ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], s.day_of_week), s.start_time
    `, [req.params.groupId]);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add schedule entry with conflict detection
router.post('/schedule/add', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { group_id, module_id, teacher_id, room_id, day_of_week, start_time, end_time } = req.body;
    
    if (!group_id || !module_id || !room_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get group index
    const groupRes = await pool.query(`SELECT group_index FROM groups WHERE id = $1`, [group_id]);
    if (groupRes.rowCount === 0) return res.status(404).json({ error: 'Group not found' });
    const groupIndex = groupRes.rows[0].group_index;
    
    // Check for room conflicts
    const conflictCheck = await pool.query(`
      SELECT id FROM schedule 
      WHERE classroom = $1 
      AND day_of_week = $2 
      AND (
        (start_time, end_time) OVERLAPS (CAST($3 AS TIME), CAST($4 AS TIME))
      )
    `, [room_id, day_of_week, start_time, end_time]);
    
    if (conflictCheck.rowCount > 0) {
      return res.status(409).json({ error: 'Room conflict: this room is already occupied during this time' });
    }
    
    // Check for teacher conflicts
    if (teacher_id) {
      const teacherConflict = await pool.query(`
        SELECT s.id FROM schedule s
        JOIN courses c ON s.course_id = c.id
        WHERE c.teacher_id = $1 
        AND s.day_of_week = $2 
        AND (
          (s.start_time, s.end_time) OVERLAPS (CAST($3 AS TIME), CAST($4 AS TIME))
        )
      `, [teacher_id, day_of_week, start_time, end_time]);
      
      if (teacherConflict.rowCount > 0) {
        return res.status(409).json({ error: 'Teacher conflict: this teacher is already busy during this time' });
      }
    }
    
    // Create course first if needed
    const moduleRes = await pool.query(`SELECT id FROM module_coefficients WHERE id = $1`, [module_id]);
    if (moduleRes.rowCount === 0) return res.status(404).json({ error: 'Module not found' });
    
    const module = moduleRes.rows[0];
    const courseRes = await pool.query(`
      INSERT INTO courses(course_code, course_name, teacher_id, course_type, credits)
      VALUES($1, $2, $3, $4, 3)
      ON CONFLICT(course_code) DO UPDATE SET teacher_id = $3 RETURNING id
    `, [`MODULE-${module_id}`, `Module ${module_id}`, teacher_id, 'CM']);
    
    const courseId = courseRes.rows[0].id;
    
    // Add schedule
    const scheduleRes = await pool.query(`
      INSERT INTO schedule(course_id, day_of_week, start_time, end_time, classroom, group_number)
      VALUES($1, $2, $3, $4, $5, $6) RETURNING *
    `, [courseId, day_of_week, start_time, end_time, room_id, groupIndex]);

    // Emit schedule update for real-time EDT updates
    try {
      const io = req.app.get('io');
      if (io) io.emit('scheduleUpdated', { groupIndex, entry: scheduleRes.rows[0] });
    } catch (e) {
      console.error('Socket emit error (scheduleUpdated):', e.message);
    }

    res.status(201).json(scheduleRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete schedule entry
router.delete('/schedule/:scheduleId', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM schedule WHERE id = $1 RETURNING *`, [req.params.scheduleId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Schedule entry not found' });
    
    // Emit deletion event
    try {
      const io = req.app.get('io');
      if (io) io.emit('scheduleDeleted', { groupIndex: result.rows[0].group_number, deleted: result.rows[0] });
    } catch (e) {
      console.error('Socket emit error (scheduleDeleted):', e.message);
    }

    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ---- Export Agent Credentials as PDF (server-side generation) ----
router.post('/credentials/export-pdf', verifyToken, verifyRole(['agent']), (req, res) => {
  try {
    const { email, password, agent_id, first_name, last_name } = req.body;
    
    // Simple approach: generate HTML and return as downloadable text file
    // (Browser can convert to PDF via print, or use a PDF library like pdfkit)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pedagogical Agent Credentials</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
    .credential { margin: 20px 0; }
    .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 18px; color: #000; padding: 10px; background: #f9f9f9; border-left: 4px solid #6366f1; margin-top: 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
    @media print { body { margin: 0; padding: 0; } .container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎓 Pedagogical Agent Credentials</h1>
    <p>Generated for: <strong>${first_name} ${last_name}</strong></p>
    
    <div class="credential">
      <div class="label">📧 Email</div>
      <div class="value">${email}</div>
    </div>
    
    <div class="credential">
      <div class="label">🔐 Password</div>
      <div class="value">${password}</div>
    </div>
    
    <div class="credential">
      <div class="label">🆔 Agent ID</div>
      <div class="value">${agent_id || 'N/A'}</div>
    </div>
    
    <div class="footer">
      <p>⚠️ Please save these credentials securely. The password cannot be recovered if lost.</p>
      <p>Generated on: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="agent-credentials-${Date.now()}.html"`);
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DELETE OPERATIONS ====================

// Delete Specialty
router.delete('/specialties/:id', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    await pool.query('DELETE FROM specialties WHERE id = $1', [req.params.id]);
    res.json({ message: 'Specialty deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Semester
router.delete('/semesters/:id', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    await pool.query('DELETE FROM semesters WHERE id = $1', [req.params.id]);
    res.json({ message: 'Semester deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Module
router.delete('/semesters/:semesterId/modules/:moduleId', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    await pool.query('DELETE FROM module_coefficients WHERE id = $1', [req.params.moduleId]);
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Group
router.delete('/specialties/:specialtyId/groups/:groupId', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    await pool.query('DELETE FROM groups WHERE id = $1', [req.params.groupId]);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== UPDATE OPERATIONS ====================

// Update Specialty
router.put('/specialties/:id', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'UPDATE specialties SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Semester
router.put('/semesters/:id', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { number } = req.body;
    const result = await pool.query(
      'UPDATE semesters SET number = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [number, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Module
router.put('/modules/:id', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { module_name, coefficient, module_type } = req.body;
    const result = await pool.query(
      'UPDATE module_coefficients SET module_name = $1, coefficient = $2, module_type = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [module_name, coefficient, module_type, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign student to group
router.post('/students/:studentId/assign-group', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: 'Group ID required' });
    
    const { studentId } = req.params;
    
    // Get group_index from group
    const groupRes = await pool.query('SELECT group_index FROM groups WHERE id = $1', [groupId]);
    if (groupRes.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    
    const groupIndex = groupRes.rows[0].group_index;
    
    // Update student's group assignment
    const result = await pool.query(
      'UPDATE students SET group_number = $1 WHERE id = $2 RETURNING *',
      [groupIndex, studentId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    
    // Ensure student is in group_students junction table
    await pool.query(
      'INSERT INTO group_students(group_id, student_id) VALUES($1, $2) ON CONFLICT DO NOTHING',
      [groupId, studentId]
    );
    
    res.json({ message: 'Student assigned to group', student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove student from group
router.delete('/students/:studentId/group', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Update student's group assignment to NULL
    const result = await pool.query(
      'UPDATE students SET group_number = NULL WHERE id = $1 RETURNING *',
      [studentId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    
    // Remove from group_students
    await pool.query('DELETE FROM group_students WHERE student_id = $1', [studentId]);
    
    res.json({ message: 'Student removed from group' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update group (name/details)
router.put('/groups/:groupId', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { name } = req.body;
    const { groupId } = req.params;
    
    const result = await pool.query(
      'UPDATE groups SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [name, groupId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

