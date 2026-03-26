const pool = require('../src/config/database');

(async () => {
  try {
    const email = process.argv[2] || 'alice.teacher@example.com';
    const res = await pool.query(
      `SELECT t.id, t.teacher_id, t.specialty_id, t.agent_id, u.email, u.first_name, u.last_name
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );

    console.log('Teacher rows:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
})();
