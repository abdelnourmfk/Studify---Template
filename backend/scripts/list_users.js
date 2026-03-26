const pool = require('../src/config/database');

(async () => {
  try {
    const res = await pool.query('SELECT id, email, role, first_name, last_name, password FROM users ORDER BY id');
    if (res.rows.length === 0) {
      console.log('NO_USERS');
    } else {
      console.log(JSON.stringify(res.rows, null, 2));
    }
  } catch (err) {
    console.error('QUERY_ERROR', err.message || err);
  } finally {
    await pool.end();
  }
})();
