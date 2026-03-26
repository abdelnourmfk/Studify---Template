const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Publish grades (Teacher only)
router.post('/publish', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const { student_id, course_id, exam_grade, control_grade, tp_grade } = req.body;

    const final_grade = (exam_grade * 0.5) + (control_grade * 0.3) + (tp_grade * 0.2);

    const result = await pool.query(`
      INSERT INTO grades (student_id, course_id, exam_grade, control_grade, tp_grade, final_grade, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())
      ON CONFLICT (student_id, course_id) 
      DO UPDATE SET exam_grade=$3, control_grade=$4, tp_grade=$5, final_grade=$6, status='published', published_at=NOW()
      RETURNING *
    `, [student_id, course_id, exam_grade, control_grade, tp_grade, final_grade]);

    res.json({ message: 'Grades published successfully', grade: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get grades by course
router.get('/course/:courseId', verifyToken, verifyRole(['teacher', 'agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, u.first_name, u.last_name, s.student_id
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE g.course_id = $1
      ORDER BY u.last_name
    `, [req.params.courseId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
