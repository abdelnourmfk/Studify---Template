const pool = require('../src/config/database');

const email = process.argv[2];

if (!email) {
  console.error('USAGE: node delete_user.js <email>');
  process.exit(1);
}

(async () => {
  try {
    const res = await pool.query('DELETE FROM users WHERE LOWER(email) = LOWER($1) RETURNING id, email', [email]);
    if (res.rows.length === 0) {
      console.log('NOT_FOUND');
    } else {
      console.log('DELETED', JSON.stringify(res.rows[0]));
    }
  } catch (err) {
    console.error('DELETE_ERROR', err.message || err);
    process.exit(2);
  } finally {
    await pool.end();
  }
})();
