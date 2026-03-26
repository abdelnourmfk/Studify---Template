const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.first_name, u.last_name, s.name as specialization, sem.number as semester_num
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN specialties s ON c.specialty_id = s.id
      LEFT JOIN semesters sem ON c.semester_id = sem.id
      ORDER BY c.course_code
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create course (Agent) - by selecting modules
router.post('/create', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { course_code, course_name, module_ids, course_type, credits, teacher_id } = req.body;

    // Validate required fields
    if (!course_code || !course_name || !module_ids || module_ids.length === 0) {
      return res.status(400).json({ error: 'Course code, name, and at least one module are required' });
    }

    // Validate all modules exist and get their semester_id and specialty_id
    const moduleCheck = await pool.query(`
      SELECT DISTINCT m.id, m.semester_id, s.id as specialty_id
      FROM module_coefficients m
      JOIN semesters s ON m.semester_id = s.id
      WHERE m.id = ANY($1::int[])
    `, [module_ids]);

    if (moduleCheck.rows.length === 0) {
      return res.status(400).json({ error: 'One or more modules not found' });
    }

    // All modules must belong to the same semester and specialty
    const firstModule = moduleCheck.rows[0];
    const semesterId = firstModule.semester_id;
    const specialtyId = firstModule.specialty_id;

    if (!moduleCheck.rows.every(m => m.semester_id === semesterId && m.specialty_id === specialtyId)) {
      return res.status(400).json({ error: 'All modules must belong to the same semester and specialty' });
    }

    // Validate teacher if provided
    let validTeacherId = null;
    if (teacher_id && teacher_id !== '') {
      const teacherCheck = await pool.query(
        'SELECT id FROM teachers WHERE id = $1',
        [parseInt(teacher_id)]
      );
      if (teacherCheck.rows.length === 0) {
        return res.status(400).json({ error: `Teacher with ID ${teacher_id} not found` });
      }
      validTeacherId = parseInt(teacher_id);
    }

    // Use transaction to create course and course_modules
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create course
      const courseResult = await client.query(`
        INSERT INTO courses (course_code, course_name, semester_id, specialty_id, course_type, credits, teacher_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [course_code, course_name, semesterId, specialtyId, course_type || 'CM', credits || 3, validTeacherId]);

      const courseId = courseResult.rows[0].id;

      // Link modules to course
      for (const moduleId of module_ids) {
        await client.query(`
          INSERT INTO course_modules (course_id, module_id, created_at)
          VALUES ($1, $2, NOW())
        `, [courseId, moduleId]);
      }

      await client.query('COMMIT');

      res.status(201).json({ 
        ...courseResult.rows[0], 
        module_count: module_ids.length,
        message: 'Course created with modules'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Course creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get courses by specialty and semester
router.get('/specialty/:specialtyId/semester/:semesterId', verifyToken, async (req, res) => {
  try {
    const { specialtyId, semesterId } = req.params;
    
    const result = await pool.query(`
      SELECT c.*, 
             u.first_name, u.last_name,
             s.name as specialization,
             sem.number as semester_num,
             array_agg(m.module_name) as modules
      FROM courses c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN specialties s ON c.specialty_id = s.id
      LEFT JOIN semesters sem ON c.semester_id = sem.id
      LEFT JOIN course_modules cm ON c.id = cm.course_id
      LEFT JOIN module_coefficients m ON cm.module_id = m.id
      WHERE c.specialty_id = $1 AND c.semester_id = $2
      GROUP BY c.id, u.first_name, u.last_name, s.name, sem.number
      ORDER BY c.course_code
    `, [specialtyId, semesterId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all available modules for a specialty/semester (for course creation form)
router.get('/modules/specialty/:specialtyId/semester/:semesterId', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { specialtyId, semesterId } = req.params;
    
    const result = await pool.query(`
      SELECT m.id, m.module_name, m.coefficient, m.module_type, s.number as semester_num
      FROM module_coefficients m
      JOIN semesters s ON m.semester_id = s.id
      WHERE s.specialty_id = $1 AND s.id = $2
      ORDER BY m.module_name
    `, [specialtyId, semesterId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent can assign/change teacher for a course
router.put('/:courseId/assign', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { teacher_id } = req.body; // this is teachers.id (PK)
    const courseId = req.params.courseId;

    const result = await pool.query(`
      UPDATE courses SET teacher_id = $1 WHERE id = $2 RETURNING *
    `, [teacher_id || null, courseId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Course not found' });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unassigned courses (agent)
router.get('/unassigned', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM courses WHERE teacher_id IS NULL ORDER BY course_code
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
