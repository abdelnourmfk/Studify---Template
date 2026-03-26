const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { scanFile } = require('../utils/virusScan');

const UPLOADS_DIR = process.env.UPLOADS_DIR || 'uploads_private';
try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) { /* ignore */ }

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR + '/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\-_.]/g, '_').slice(0, 120);
    cb(null, Date.now() + '-' + base + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/mp4',
      'image/jpeg',
      'image/png',
      'text/csv',
      'application/zip'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    // Basic mime + extension cross-check
    if (allowed.includes(file.mimetype) && ext.match(/\.(pdf|doc|docx|ppt|pptx|mp4|jpe?g|png|csv|zip)$/i)) return cb(null, true);
    cb(new Error('Invalid file type'));
};

const upload = multer({ 
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || 50 * 1024 * 1024) },
  fileFilter
});

// Get teacher profile
router.get('/profile', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, t.teacher_id, t.department, t.specialization, t.office_location
      FROM users u
      JOIN teachers t ON u.id = t.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all teachers (for agents management)
router.get('/all', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, u.first_name, u.last_name, u.email, t.teacher_id, t.department, 
             t.specialization, t.specialty_id, s.name as specialty_name
      FROM users u
      JOIN teachers t ON u.id = t.user_id
      LEFT JOIN specialties s ON t.specialty_id = s.id
      ORDER BY u.last_name, u.first_name
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get teachers by specialty (for teacher dashboard view)
router.get('/specialty/:specialtyId', verifyToken, async (req, res) => {
  try {
    const { specialtyId } = req.params;
    const result = await pool.query(`
      SELECT t.id, u.first_name, u.last_name, u.email, t.teacher_id, t.department, 
             t.specialization, t.specialty_id, s.name as specialty_name
      FROM users u
      JOIN teachers t ON u.id = t.user_id
      LEFT JOIN specialties s ON t.specialty_id = s.id
      WHERE t.specialty_id = $1
      ORDER BY u.last_name, u.first_name
    `, [specialtyId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current logged-in teacher info (with specialty)
router.get('/me', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, u.first_name, u.last_name, u.email, t.teacher_id, t.department, 
             t.specialization, t.specialty_id, s.name as specialty_name
      FROM users u
      JOIN teachers t ON u.id = t.user_id
      LEFT JOIN specialties s ON t.specialty_id = s.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get teacher's courses
router.get('/my-courses', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT c.*
      FROM courses c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE t.user_id = $1
      ORDER BY c.course_code
    `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});// Publish grades for students
router.post('/publish-grades', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const { course_id, grades } = req.body;
    
    // Verify teacher owns this course
    const courseCheck = await pool.query(`
      SELECT c.id FROM courses c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = $1 AND t.user_id = $2
    `, [course_id, req.user.id]);

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const results = [];
    for (const grade of grades) {
      const final_grade = (grade.exam_grade * 0.5) + (grade.control_grade * 0.3) + (grade.tp_grade * 0.2);
      
      const result = await pool.query(`
        INSERT INTO grades (student_id, course_id, exam_grade, control_grade, tp_grade, final_grade, status, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW())
        ON CONFLICT (student_id, course_id) 
        DO UPDATE SET exam_grade=$3, control_grade=$4, tp_grade=$5, final_grade=$6, status='published', published_at=NOW()
        RETURNING *
      `, [grade.student_id, course_id, grade.exam_grade, grade.control_grade, grade.tp_grade, final_grade]);
      
      results.push(result.rows[0]);
    }

    res.json({ 
      message: `Grades published for ${results.length} students`,
      grades: results
    });
    // Emit real-time notification about published grades
    try {
      const io = req.app.get('io');
      if (io) io.emit('gradesPublished', { course_id, grades: results });
    } catch (e) {
      console.error('Socket emit error (gradesPublished):', e.message);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload course materials
router.post('/upload-material', verifyToken, verifyRole(['teacher']), upload.single('file'), async (req, res) => {
  try {
    const { course_id, title, description, material_type } = req.body;

    // Verify teacher owns this course
    const courseCheck = await pool.query(`
      SELECT c.id FROM courses c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = $1 AND t.user_id = $2
    `, [course_id, req.user.id]);

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const file_path = req.file ? req.file.filename : null; // stored in private uploads dir

    // If a file was uploaded, run virus scan (if scanner available)
    if (file_path) {
      const abs = path.resolve(UPLOADS_DIR, file_path);
      try {
        const scanRes = await scanFile(abs);
        if (scanRes.scanned && scanRes.ok === false) {
          // infected - remove file and reject
          try { fs.unlinkSync(abs); } catch (e) { /* ignore */ }
          return res.status(400).json({ error: 'Uploaded file failed virus scan' });
        }
      } catch (scanErr) {
        console.warn('Virus scan failed or skipped:', scanErr && scanErr.message ? scanErr.message : scanErr);
        // proceed but log; in production you may want to reject when scan can't run
      }
    }

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

// Protected download endpoint for course material files
router.get('/material/:id/download', verifyToken, async (req, res) => {
  try {
    const matRes = await pool.query(`
      SELECT cm.id, cm.course_id, cm.file_path, c.course_code, t.user_id as teacher_user_id
      FROM course_materials cm
      JOIN courses c ON cm.course_id = c.id
      JOIN teachers t ON c.teacher_id = t.id
      WHERE cm.id = $1
    `, [req.params.id]);

    if (matRes.rows.length === 0) return res.status(404).json({ error: 'Material not found' });
    const mat = matRes.rows[0];

    // Authorization: teacher who owns it, enrolled student, or agent
    if (req.user.role === 'teacher') {
      if (req.user.id !== mat.teacher_user_id) return res.status(403).json({ error: 'Forbidden' });
    } else if (req.user.role === 'student') {
      const enroll = await pool.query(`SELECT 1 FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.course_id = $1 AND s.user_id = $2`, [mat.course_id, req.user.id]);
      if (enroll.rows.length === 0) return res.status(403).json({ error: 'You are not enrolled in this course' });
    } else if (req.user.role === 'agent') {
      // agents allowed
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const absPath = path.resolve(UPLOADS_DIR, mat.file_path);
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found on server' });

    res.download(absPath, mat.file_path, (err) => {
      if (err) console.error('Download error:', err.message);
    });
  } catch (err) {
    console.error('Download endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send announcement to students
router.post('/announcement', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const { course_id, title, content } = req.body;

    // Verify teacher owns this course
    const courseCheck = await pool.query(`
      SELECT c.id FROM courses c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = $1 AND t.user_id = $2
    `, [course_id, req.user.id]);

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const result = await pool.query(`
      INSERT INTO announcements (author_id, title, content, target_audience, course_id)
      VALUES ($1, $2, $3, 'students', $4)
      RETURNING *
    `, [req.user.id, title, content, course_id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get students in a course
router.get('/course/:courseId/students', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, s.student_id
      FROM users u
      JOIN students s ON u.id = s.user_id
      JOIN enrollments e ON s.id = e.student_id
      WHERE e.course_id = $1
      ORDER BY u.last_name
    `, [req.params.courseId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List materials for a course (teachers, students, agents)
router.get('/course/:courseId/materials', verifyToken, verifyRole(['teacher','student','agent']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, file_path, material_type, uploaded_at, created_at
      FROM course_materials
      WHERE course_id = $1
      ORDER BY uploaded_at DESC NULLS LAST, created_at DESC
    `, [req.params.courseId]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update course information
router.put('/course/:courseId', verifyToken, verifyRole(['teacher']), async (req, res) => {
  try {
    const { course_name, description } = req.body;

    // Verify teacher owns this course
    const courseCheck = await pool.query(`
      SELECT c.id FROM courses c
      JOIN teachers t ON c.teacher_id = t.id
      WHERE c.id = $1 AND t.user_id = $2
    `, [req.params.courseId, req.user.id]);

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const result = await pool.query(`
      UPDATE courses 
      SET course_name = $1, description = $2
      WHERE id = $3
      RETURNING *
    `, [course_name, description, req.params.courseId]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update teacher profile (by agent)
router.put('/:teacherId', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    const { first_name, last_name, email, specialization, department } = req.body;
    const teacherId = req.params.teacherId;

    // Try to find teacher by teacher PK or by user_id (frontend may send user id)
    const teacherRow = await pool.query('SELECT id, user_id FROM teachers WHERE id = $1 OR user_id = $1', [teacherId]);
    if (teacherRow.rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });

    // Ensure we use teacher PK and user_id consistently
    const teacherPk = teacherRow.rows[0].id;
    const userId = teacherRow.rows[0].user_id;

    // Use transaction to update both users and teachers tables
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (first_name || last_name || email) {
        await client.query(
          'UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), email = COALESCE($3, email) WHERE id = $4',
          [first_name, last_name, email, userId]
        );
      }

      await client.query(
        'UPDATE teachers SET specialization = COALESCE($1, specialization), department = COALESCE($2, department) WHERE id = $3',
        [specialization, department, teacherPk]
      );

      await client.query('COMMIT');
      res.json({ message: 'Teacher updated' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating teacher:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete teacher
router.delete('/:teacherId', verifyToken, verifyRole(['agent']), async (req, res) => {
  try {
    // Find the user_id from teacher id
    const teacherResult = await pool.query(
      'SELECT user_id FROM teachers WHERE id = $1',
      [req.params.teacherId]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const userId = teacherResult.rows[0].user_id;

    // Delete user (CASCADE will delete teacher record)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
