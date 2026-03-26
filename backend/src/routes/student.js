const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Get student's grades
router.get('/my-grades', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, c.course_name, c.course_code, c.credits
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      JOIN students s ON g.student_id = s.id
      WHERE s.user_id = $1
      ORDER BY c.course_code
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student profile
router.get('/profile', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, s.student_id, s.filiere, s.level, s.semester, s.total_credits
      FROM users u
      JOIN students s ON u.id = s.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student's courses
router.get('/my-courses', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.course_code, c.course_name, c.credits, c.course_type,
             u.first_name, u.last_name
      FROM courses c
      JOIN enrollments e ON c.id = e.course_id
      JOIN students s ON e.student_id = s.id
      JOIN teachers t ON c.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE s.user_id = $1
      ORDER BY c.course_code
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student dashboard (profile + GPA + stats + semester status)
router.get('/dashboard', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    // Get student info
    const profileRes = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, 
             s.student_id, s.filiere, s.level, s.semester, s.total_credits
      FROM users u
      JOIN students s ON u.id = s.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (profileRes.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = profileRes.rowCount > 0 ? profileRes.rows[0] : null;

    // Get grades with module info
    const gradesRes = await pool.query(`
      SELECT g.final_grade, g.status, c.credits, c.course_name, mc.coefficient
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN module_coefficients mc ON c.course_code ILIKE '%' || mc.module_name || '%'
      JOIN students s ON g.student_id = s.id
      WHERE s.user_id = $1 AND g.status = 'published'
    `, [req.user.id]);

    const grades = gradesRes.rows;

    // Calculate GPA (weighted average)
    let gpa = 0;
    let totalCredits = 0;
    let passedCourses = 0;
    let failedCourses = 0;

    if (grades.length > 0) {
      const weighted = grades.reduce((sum, g) => sum + ((g.final_grade || 0) * (g.credits || 1)), 0);
      const totalWeightedCredits = grades.reduce((sum, g) => sum + (g.credits || 1), 0);
      gpa = (weighted / totalWeightedCredits).toFixed(2);
      totalCredits = totalWeightedCredits;
      passedCourses = grades.filter(g => g.final_grade >= 10).length;
      failedCourses = grades.filter(g => g.final_grade < 10).length;
    }

    // Determine semester status based on GPA
    let semesterStatus = 'Admis';
    if (gpa < 10 && gpa > 0) semesterStatus = 'Rattrapage';
    if (gpa < 6 && failedCourses > 2) semesterStatus = 'Ajourné';
    if (failedCourses > 0) semesterStatus = 'Dettes';

    // Get enrollments count
    const enrollmentsRes = await pool.query(`
      SELECT COUNT(*) as courses_enrolled
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE s.user_id = $1
    `, [req.user.id]);

    res.json({
      student,
      stats: {
        gpa,
        totalCredits,
        passedCourses,
        failedCourses,
        enrolledCourses: enrollmentsRes.rows[0].courses_enrolled,
        semesterStatus
      },
      grades
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student's personal schedule
router.get('/schedule', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT c.id, c.course_code, c.course_name, c.course_type, c.credits,
             s.day_of_week, s.start_time, s.end_time, s.classroom,
             r.name as room_name, u.first_name, u.last_name,
             t.teacher_id, st.student_id, st.filiere, g.name as group_name
      FROM students st
      JOIN group_students gs ON st.id = gs.student_id
      JOIN groups g ON gs.group_id = g.id
      JOIN schedule s ON s.group_number = g.group_index
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN rooms r ON s.classroom = r.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE st.user_id = $1
      ORDER BY s.day_of_week, s.start_time
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student debts (failed modules, credits owed)
router.get('/debts', verifyToken, verifyRole(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.course_code, c.course_name, c.credits, g.final_grade, g.status,
             u.first_name as teacher_first, u.last_name as teacher_last
      FROM grades g
      JOIN courses c ON g.course_id = c.id
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      JOIN students s ON g.student_id = s.id
      WHERE s.user_id = $1 AND (g.final_grade < 10 OR g.status != 'published')
      ORDER BY c.course_code
    `, [req.user.id]);

    // Calculate total credits owed
    const debts = result.rows;
    const totalCreditsOwed = debts.reduce((sum, d) => sum + (d.credits || 0), 0);
    const failedModules = debts.length;

    res.json({
      debts,
      summary: {
        failedModules,
        totalCreditsOwed,
        academicStatus: failedModules === 0 ? 'Good Standing' : (failedModules > 3 ? 'At Risk' : 'Has Debts')
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
