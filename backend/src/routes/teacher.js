const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || 50000000) }
});

// ========== TEACHER DASHBOARD ==========

// Get teacher dashboard info
router.get('/dashboard', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const teacherRes = await pool.query(`
      SELECT t.id, t.teacher_id, u.first_name, u.last_name, u.email, t.specialization, t.department
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (teacherRes.rowCount === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const teacher = teacherRes.rows[0];

    // Get teacher's courses/schedule
    const scheduleRes = await pool.query(`
      SELECT DISTINCT c.id, c.course_code, c.course_name, c.course_type, c.credits,
             s.day_of_week, s.start_time, s.end_time, s.classroom, s.group_number
      FROM courses c
      LEFT JOIN schedule s ON c.id = s.course_id
      WHERE c.teacher_id = $1
      ORDER BY COALESCE(s.day_of_week, 'Monday'), COALESCE(s.start_time, '00:00')
    `, [teacher.id]);

    // Get stats
    const statsRes = await pool.query(`
      SELECT COUNT(DISTINCT e.student_id) as students_count,
             COUNT(DISTINCT c.id) as courses_count
      FROM enrollments e
      RIGHT JOIN courses c ON e.course_id = c.id
      WHERE c.teacher_id = $1
    `, [teacher.id]);

    res.json({
      teacher,
      schedule: scheduleRes.rows,
      stats: statsRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get students for teacher's courses
router.get('/:teacherId/students', verifyToken, verifyRole(['teacher', 'agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, 
             s.student_id, s.filiere, s.level,
             c.id as course_id, c.course_name, c.course_type
      FROM users u
      JOIN students s ON u.id = s.user_id
      JOIN enrollments e ON s.id = e.student_id
      JOIN courses c ON e.course_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.id = $1
      ORDER BY u.last_name, c.course_name
    `, [req.params.teacherId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get courses for teacher
router.get('/:teacherId/courses', verifyToken, verifyRole(['teacher', 'agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.course_code, c.course_name, c.course_type, c.credits,
             COUNT(DISTINCT e.student_id) as student_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.teacher_id = $1
      GROUP BY c.id
      ORDER BY c.course_name
    `, [req.params.teacherId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload course material
router.post('/upload', verifyToken, verifyRole(['teacher']), upload.single('file'), async (req, res) => {
  try {
    const { course_id, title, description, material_type } = req.body;

    const file_path = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await pool.query(`
      INSERT INTO course_materials (course_id, teacher_id, title, description, file_path, material_type)
      VALUES ($1, (SELECT id FROM teachers WHERE user_id = $2), $3, $4, $5, $6)
      RETURNING *
    `, [course_id, req.user.id, title, description, file_path, material_type]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get course materials
router.get('/course/:courseId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM course_materials
      WHERE course_id = $1
      ORDER BY upload_date DESC
    `, [req.params.courseId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publish grades for course
router.post('/publish-grades', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const { course_id, grades } = req.body;

    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'No grades provided' });
    }

    // Get teacher id
    const teacherRes = await pool.query(`
      SELECT id FROM teachers WHERE user_id = $1
    `, [req.user.id]);

    if (teacherRes.rowCount === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const teacher_id = teacherRes.rows[0].id;

    // Publish each grade: final_grade = (exam*0.5 + control*0.3 + tp*0.2)
    const publishedGrades = [];
    for (const grade of grades) {
      const final_grade = (grade.exam_grade * 0.5) + (grade.control_grade * 0.3) + (grade.tp_grade * 0.2);
      
      const gradeRes = await pool.query(`
        INSERT INTO grades (student_id, course_id, teacher_id, exam_grade, control_grade, tp_grade, final_grade, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'published')
        ON CONFLICT (student_id, course_id) DO UPDATE 
        SET exam_grade = $4, control_grade = $5, tp_grade = $6, final_grade = $7, status = 'published'
        RETURNING *
      `, [grade.student_id, course_id, teacher_id, grade.exam_grade, grade.control_grade, grade.tp_grade, final_grade]);

      publishedGrades.push(gradeRes.rows[0]);
    }

    res.json({ success: true, grades: publishedGrades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send announcement to class
router.post('/announcement', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const { course_id, title, content } = req.body;

    if (!course_id || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(`
      INSERT INTO announcements (course_id, author_id, title, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [course_id, req.user.id, title, content]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
