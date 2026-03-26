const pool = require('./database');

const initializeDatabase = async () => {
  try {
    // Create Users Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'agent')),
        phone VARCHAR(20),
        profile_picture VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Students Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        student_id VARCHAR(50) UNIQUE NOT NULL,
        filiere VARCHAR(100),
        level VARCHAR(50),
        semester INTEGER,
        enrollment_year INTEGER,
        total_credits DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure updated_at and specialty_id exist on students (routes may set them)
    await pool.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await pool.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS specialty_id INTEGER REFERENCES specialties(id) ON DELETE SET NULL;
    `);

    // Create Teachers Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        teacher_id VARCHAR(50) UNIQUE NOT NULL,
        department VARCHAR(100),
        specialization VARCHAR(255),
        office_location VARCHAR(100),
        specialty_id INTEGER REFERENCES specialties(id) ON DELETE SET NULL,
        agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure teachers.specialty_id exists (in case table was created earlier without it)
    await pool.query(`
      ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS specialty_id INTEGER REFERENCES specialties(id) ON DELETE SET NULL;
    `);
    // Ensure teachers.agent_id exists
    await pool.query(`
      ALTER TABLE teachers
      ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    `);

    // Ensure teacher_signup_codes.created_by_agent_id exists
    await pool.query(`
      ALTER TABLE teacher_signup_codes
      ADD COLUMN IF NOT EXISTS created_by_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL;
    `);

    // Create Pedagogical Agents Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        agent_id VARCHAR(50) UNIQUE NOT NULL,
        department VARCHAR(100),
        permissions VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Agent Signup Codes Table (for verifying new agent registration)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_signup_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        signup_code VARCHAR(50) NOT NULL UNIQUE,
        agent_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        used_at TIMESTAMP,
        used_by_user_id INTEGER REFERENCES users(id)
      );
    `);

    // Create Teacher Signup Codes Table (for verifying new teacher registration)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_signup_codes (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        signup_code VARCHAR(50) NOT NULL UNIQUE,
        specialty_id INTEGER NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
        teacher_id VARCHAR(50),
        created_by_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        used_at TIMESTAMP,
        used_by_user_id INTEGER REFERENCES users(id),
        UNIQUE(email, specialty_id)
      );
    `);

    // Create Password Reset Tokens Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        used_at TIMESTAMP
      );
    `);

    // Create Courses Table - Now linked to modules
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        course_code VARCHAR(50) UNIQUE NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
        semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
        specialty_id INTEGER REFERENCES specialties(id) ON DELETE CASCADE,
        course_type VARCHAR(50) CHECK (course_type IN ('CM', 'TD', 'TP', 'Projet')),
        credits INTEGER DEFAULT 3,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Course-Module Mapping Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        module_id INTEGER NOT NULL REFERENCES module_coefficients(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course_id, module_id)
      );
    `);

    // Create Enrollments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'enrolled',
        UNIQUE(student_id, course_id)
      );
    `);

    // Create Grades Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grades (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        exam_grade DECIMAL(5, 2),
        control_grade DECIMAL(5, 2),
        tp_grade DECIMAL(5, 2),
        final_grade DECIMAL(5, 2),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'appealed')),
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_id)
      );
    `);

    // Create Schedule Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        day_of_week VARCHAR(20),
        start_time TIME,
        end_time TIME,
        classroom VARCHAR(100),
        group_number INTEGER,
        season VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Course Materials Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS course_materials (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES teachers(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_path VARCHAR(500),
        material_type VARCHAR(50) CHECK (material_type IN ('PDF', 'Video', 'Exercise', 'External Link')),
        external_link VARCHAR(500),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Announcements Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        author_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        target_audience VARCHAR(50),
        course_id INTEGER REFERENCES courses(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Time Employment Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_employment (
        id SERIAL PRIMARY KEY,
        filiere VARCHAR(100),
        level VARCHAR(50),
        group_number INTEGER,
        monday TEXT,
        tuesday TEXT,
        wednesday TEXT,
        thursday TEXT,
        friday TEXT,
        saturday TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Universities / Faculties / Specialties
    await pool.query(`
      CREATE TABLE IF NOT EXISTS universities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculties (
        id SERIAL PRIMARY KEY,
        university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(university_id, name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS specialties (
        id SERIAL PRIMARY KEY,
        faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        degree_system VARCHAR(50) DEFAULT 'LMD',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(faculty_id, name)
      );
    `);

    // Ensure updated_at exists on specialties (routes may set it)
    await pool.query(`
      ALTER TABLE specialties
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS specialty_options (
        id SERIAL PRIMARY KEY,
        specialty_id INTEGER REFERENCES specialties(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Semesters & Module coefficients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS semesters (
        id SERIAL PRIMARY KEY,
        specialty_id INTEGER REFERENCES specialties(id) ON DELETE CASCADE,
        number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(specialty_id, number)
      );
    `);

    // Ensure updated_at exists on semesters (routes may set it)
    await pool.query(`
      ALTER TABLE semesters
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS module_coefficients (
        id SERIAL PRIMARY KEY,
        semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
        module_name VARCHAR(255) NOT NULL,
        coefficient DECIMAL(5,2) DEFAULT 1,
        module_type VARCHAR(50) CHECK (module_type IN ('CM','TD','TP','Projet')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure updated_at exists on module_coefficients (routes expect it)
    await pool.query(`
      ALTER TABLE module_coefficients
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // Groups and group membership
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        specialty_id INTEGER REFERENCES specialties(id) ON DELETE CASCADE,
        name VARCHAR(100),
        group_index INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_students (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE(group_id, student_id)
      );
    `);

    // Link specialty to pedagogical agent
    await pool.query(`
      CREATE TABLE IF NOT EXISTS specialty_agents (
        id SERIAL PRIMARY KEY,
        specialty_id INTEGER REFERENCES specialties(id) ON DELETE CASCADE,
        agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
        UNIQUE(specialty_id)
      );
    `);

    // Rooms
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        capacity INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial university/faculty/specialty and create a sample pedagogical agent
    const bcrypt = require('bcryptjs');
    const samplePassword = 'Agent123!';
    const hashed = await bcrypt.hash(samplePassword, 10);

    // Insert University / Faculty / Specialty if not exists
    const uniRes = await pool.query(`SELECT id FROM universities WHERE name = $1`, ["Université d'Oran 1"]);
    let universityId;
    if (uniRes.rowCount === 0) {
      const r = await pool.query(`INSERT INTO universities(name) VALUES($1) RETURNING id`, ["Université d'Oran 1"]);
      universityId = r.rows[0].id;
    } else {
      universityId = uniRes.rows[0].id;
    }

    const facRes = await pool.query(`SELECT id FROM faculties WHERE university_id = $1 AND name = $2`, [universityId, 'Sciences Exactes']);
    let facultyId;
    if (facRes.rowCount === 0) {
      const r = await pool.query(`INSERT INTO faculties(university_id, name) VALUES($1,$2) RETURNING id`, [universityId, 'Sciences Exactes']);
      facultyId = r.rows[0].id;
    } else {
      facultyId = facRes.rows[0].id;
    }

    const specRes = await pool.query(`SELECT id FROM specialties WHERE faculty_id = $1 AND name = $2`, [facultyId, 'Informatique']);
    let specialtyId;
    if (specRes.rowCount === 0) {
      const r = await pool.query(`INSERT INTO specialties(faculty_id, name, degree_system) VALUES($1,$2,$3) RETURNING id`, [facultyId, 'Informatique', 'LMD']);
      specialtyId = r.rows[0].id;
    } else {
      specialtyId = specRes.rows[0].id;
    }

    // Create sample principal agent user if not exists (only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      const agentEmail = 'agent.principal@oran1.edu';
      const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [agentEmail]);
      let agentUserId;
      if (userRes.rowCount === 0) {
        const u = await pool.query(`INSERT INTO users(email, password, first_name, last_name, role) VALUES($1,$2,$3,$4,$5) RETURNING id`, [agentEmail, hashed, 'Agent', 'Principal', 'agent']);
        agentUserId = u.rows[0].id;
        // Mark this seeded agent as the principal agent with elevated permissions
        await pool.query(`INSERT INTO agents(user_id, agent_id, department, permissions) VALUES($1,$2,$3,$4)`, [agentUserId, 'AG-PRINC-001', 'Administration', 'principal']);
        console.log('Seeded sample principal pedagogical agent:', agentEmail);
      } else {
        agentUserId = userRes.rows[0].id;
      }
    } else {
      console.log('Skipping sample agent seed in production environment');
    }

    console.log('✓ Database tables created successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
};

module.exports = { initializeDatabase };
