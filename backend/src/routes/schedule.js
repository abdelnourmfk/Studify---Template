const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Get schedule for student
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.course_code, c.course_name
      FROM schedule s
      JOIN courses c ON s.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      JOIN students st ON e.student_id = st.id
      WHERE st.id = $1
      ORDER BY CASE WHEN s.day_of_week = 'Monday' THEN 1
                   WHEN s.day_of_week = 'Tuesday' THEN 2
                   WHEN s.day_of_week = 'Wednesday' THEN 3
                   WHEN s.day_of_week = 'Thursday' THEN 4
                   WHEN s.day_of_week = 'Friday' THEN 5
                   WHEN s.day_of_week = 'Saturday' THEN 6 END,
               s.start_time
    `, [req.params.studentId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update schedule (Agent only)
router.post('/create', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { course_id, day_of_week, start_time, end_time, classroom, group_number } = req.body;

    const result = await pool.query(`
      INSERT INTO schedule (course_id, day_of_week, start_time, end_time, classroom, group_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [course_id, day_of_week, start_time, end_time, classroom, group_number]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
