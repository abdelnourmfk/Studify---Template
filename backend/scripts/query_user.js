const pool = require('../src/config/database');

const email = process.argv[2] || 'teacher@example.com';

(async () => {
  try {
    const res = await pool.query('SELECT id, email, password, first_name, last_name, role FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (res.rows.length === 0) {
      console.log('NOT_FOUND');
    } else {
      console.log(JSON.stringify(res.rows[0], null, 2));
    }
  } catch (err) {
    console.error('QUERY_ERROR', err.message || err);
  } finally {
    await pool.end();
  }
})();
