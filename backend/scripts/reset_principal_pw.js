const bcrypt = require('bcryptjs');
const { Client } = require('pg');

(async () => {
  try {
    const hash = bcrypt.hashSync('root', 12);

    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'info_7_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'root'
    });

    await client.connect();
    const res = await client.query('UPDATE users SET password=$1 WHERE LOWER(email)=LOWER($2)', [hash, 'agent.principal@oran1.edu']);
    console.log('updated rows:', res.rowCount);
    await client.end();
  } catch (e) {
    console.error('Failed to reset principal password', e);
    process.exit(1);
  }
})();
