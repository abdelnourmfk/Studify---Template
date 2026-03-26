const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Get all announcements for student
router.get('/announcements', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.first_name, u.last_name, c.course_name
      FROM announcements a
      JOIN users u ON a.author_id = u.id
      LEFT JOIN courses c ON a.course_id = c.id
      WHERE a.target_audience = 'students' OR a.course_id IN (
        SELECT c.id FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        JOIN students s ON e.student_id = s.id
        WHERE s.user_id = $1
      )
      ORDER BY a.created_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get course materials for enrolled courses
router.get('/course-materials', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cm.*, c.course_name, c.course_code, u.first_name, u.last_name
      FROM course_materials cm
      JOIN courses c ON cm.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      JOIN students s ON e.student_id = s.id
      JOIN users u ON cm.teacher_id = (SELECT user_id FROM teachers WHERE id = cm.teacher_id)
      WHERE s.user_id = $1
      ORDER BY c.course_code, cm.upload_date DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student schedule
router.get('/schedule', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.course_code, c.course_name, u.first_name, u.last_name
      FROM schedule s
      JOIN courses c ON s.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      JOIN students st ON e.student_id = st.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE st.user_id = $1
      ORDER BY CASE WHEN s.day_of_week = 'Monday' THEN 1
                   WHEN s.day_of_week = 'Tuesday' THEN 2
                   WHEN s.day_of_week = 'Wednesday' THEN 3
                   WHEN s.day_of_week = 'Thursday' THEN 4
                   WHEN s.day_of_week = 'Friday' THEN 5
                   WHEN s.day_of_week = 'Saturday' THEN 6 END,
               s.start_time
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download course material
router.get('/material/:materialId/download', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cm.file_path, c.id as course_id
      FROM course_materials cm
      JOIN courses c ON cm.course_id = c.id
      JOIN enrollments e ON c.id = e.course_id
      JOIN students s ON e.student_id = s.id
      WHERE cm.id = $1 AND s.user_id = $2
    `, [req.params.materialId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found or access denied' });
    }

    const filePath = result.rows[0].file_path;
    res.download(`.${filePath}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get transcript (academic summary)
router.get('/transcript', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const studentResult = await pool.query(`
      SELECT u.first_name, u.last_name, u.email, s.student_id, s.filiere, 
             s.level, s.semester
      FROM users u
      JOIN students s ON u.id = s.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    const gradesResult = await pool.query(`
      SELECT g.*, c.course_code, c.course_name, c.credits
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      JOIN students s ON g.student_id = s.id
      WHERE s.user_id = $1
      ORDER BY c.course_code
    `, [req.user.id]);

    const student = studentResult.rows[0];
    const grades = gradesResult.rows;

    let totalCredits = 0;
    let totalGradePoints = 0;
    
    grades.forEach(grade => {
      if (grade.final_grade && grade.final_grade >= 10) {
        totalCredits += grade.credits || 0;
        totalGradePoints += (grade.final_grade * (grade.credits || 1));
      }
    });

    const gpa = grades.length > 0 ? (totalGradePoints / grades.length).toFixed(2) : 0;

    res.json({
      student,
      grades,
      summary: {
        totalCredits: totalCredits,
        gpa: gpa,
        passedCourses: grades.filter(g => g.final_grade >= 10).length,
        totalCourses: grades.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
