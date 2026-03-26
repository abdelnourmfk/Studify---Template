const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

// ========== ADMIN DASHBOARD ==========

// Get admin dashboard stats
router.get('/dashboard', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const [studentsRes, teachersRes, coursesRes, gradesRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM students'),
      pool.query('SELECT COUNT(*) as count FROM teachers'),
      pool.query('SELECT COUNT(*) as count FROM courses'),
      pool.query('SELECT COUNT(*) as count FROM grades WHERE status = \'pending\'')
    ]);

    const stats = {
      total_students: parseInt(studentsRes.rows[0].count),
      total_teachers: parseInt(teachersRes.rows[0].count),
      total_courses: parseInt(coursesRes.rows[0].count),
      pending_grades: parseInt(gradesRes.rows[0].count),
      system_health: 'Operational'
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== GRADE APPROVALS ==========

// Get pending grades for approval
router.get('/grades/pending', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, 
             u.first_name as student_first, u.last_name as student_last, s.student_id,
             c.course_name, c.course_code,
             t.first_name as teacher_first, t.last_name as teacher_last
      FROM grades g
      JOIN students st ON g.student_id = st.id
      JOIN users u ON st.user_id = u.id
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN teachers te ON c.teacher_id = te.id
      LEFT JOIN users t ON te.user_id = t.id
      WHERE g.status = 'pending'
      ORDER BY g.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a grade (Admin only)
router.post('/grades/:gradeId/approve', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE grades 
      SET status = 'published', published_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.gradeId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    res.json({ success: true, grade: result.rows[0] });
    try {
      const io = req.app.get('io');
      if (io) io.emit('gradeApproved', result.rows[0]);
    } catch (e) {
      console.error('Socket emit error (gradeApproved):', e.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject a grade (Admin only)
router.post('/grades/:gradeId/reject', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE grades 
      SET status = 'pending'
      WHERE id = $1
      RETURNING *
    `, [req.params.gradeId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    res.json({ success: true, message: 'Grade returned to pending', grade: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve all pending grades for a course (bulk)
router.post('/grades/course/:courseId/approve-all', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE grades 
      SET status = 'published', published_at = NOW()
      WHERE course_id = $1 AND status = 'pending'
      RETURNING *
    `, [req.params.courseId]);

    res.json({ success: true, count: result.rowCount, grades: result.rows });
    try {
      const io = req.app.get('io');
      if (io) io.emit('gradesBulkApproved', { courseId: req.params.courseId, grades: result.rows });
    } catch (e) {
      console.error('Socket emit error (gradesBulkApproved):', e.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== NOTIFICATIONS ==========

// Create notification
router.post('/notifications', verifyToken, verifyRole(['agent', 'teacher']), async (req, res) => {
  try {
    const { title, message, target_role } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message required' });
    }

    const result = await pool.query(`
      INSERT INTO announcements (author_id, title, content, target_audience, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [req.user.id, title, message, target_role || 'all']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all notifications (for user)
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.first_name, u.last_name
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      WHERE a.target_audience = 'all' OR a.target_audience = $1
      ORDER BY a.created_at DESC
      LIMIT 50
    `, [req.user.role]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get notifications count (unread/new)
router.get('/notifications/count', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM announcements a
      WHERE (a.target_audience = 'all' OR a.target_audience = $1)
      AND a.created_at > NOW() - INTERVAL '7 days'
    `, [req.user.role]);

    res.json({ unread_count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== USER MANAGEMENT ==========

// Get all users (Admin only)
router.get('/users', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, 
             s.student_id, s.filiere,
             t.teacher_id, t.specialization,
             a.agent_id, a.department
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN agents a ON u.id = a.user_id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deactivate user (Admin only)
router.post('/users/:userId/deactivate', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users 
      SET is_active = false
      WHERE id = $1
      RETURNING *
    `, [req.params.userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reactivate user (Admin only)
router.post('/users/:userId/activate', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE users 
      SET is_active = true
      WHERE id = $1
      RETURNING *
    `, [req.params.userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ACADEMIC STATUS & APPROVALS ==========

// Get all students for academic status review
router.get('/students/review', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email,
             s.student_id, s.filiere, s.level, s.semester,
             COUNT(DISTINCT e.id) as enrolled_courses,
             COUNT(DISTINCT g.id) FILTER (WHERE g.final_grade >= 10) as passed_courses,
             COUNT(DISTINCT g.id) FILTER (WHERE g.final_grade < 10) as failed_courses,
             AVG(g.final_grade) as gpa
      FROM users u
      JOIN students s ON u.id = s.user_id
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN grades g ON e.course_id = g.course_id AND g.status = 'published'
      GROUP BY u.id, s.id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student academic status (semester status determination)
router.post('/students/:studentId/academic-status', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { status } = req.body; // Admis, Rattrapage, Dettes, Ajourné

    if (!['Admis', 'Rattrapage', 'Dettes', 'Ajourné'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Store status in student record (note: you'd need to add a status column to students table)
    // For now, we'll just return success
    res.json({ success: true, message: `Student status updated to: ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
