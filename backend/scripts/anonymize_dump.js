const bcrypt = require('bcryptjs');
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    database: process.env.DB_NAME || 'info_7_temp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'root'
  });

  try {
    await client.connect();
    const samplePassword = process.env.SAMPLE_PW || 'changeme123';
    const hash = bcrypt.hashSync(samplePassword, 12);

    console.log('Running anonymization queries...');

    await client.query(
      `UPDATE users SET email = CONCAT('user', id, '@example.com'), first_name = 'User', last_name = id::text, phone = NULL, profile_picture = NULL;`
    );

    await client.query('UPDATE users SET password = $1', [hash]);

    await client.query('UPDATE agents SET permissions = NULL');

    await client.query('TRUNCATE TABLE enrollments, grades, announcements, course_materials RESTART IDENTITY CASCADE');

    console.log('Anonymization complete. All users have password:', samplePassword);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Anonymization failed:', err.message || err);
    try { await client.end(); } catch(e){}
    process.exit(1);
  }
})();
