const pool = require('../src/config/database');

const email = process.argv[2];

if (!email) {
  console.error('USAGE: node delete_user_with_deps.js <email>');
  process.exit(1);
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userRes.rows.length === 0) {
      console.log('NOT_FOUND');
      await client.query('ROLLBACK');
      return;
    }

    const userId = userRes.rows[0].id;

    // Delete dependent rows first
    await client.query('DELETE FROM agent_signup_codes WHERE used_by_user_id = $1', [userId]);

    const delRes = await client.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [userId]);

    await client.query('COMMIT');

    console.log('DELETED', JSON.stringify(delRes.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('DELETE_ERROR', err.message || err);
    process.exit(2);
  } finally {
    client.release();
    await pool.end();
  }
})();
