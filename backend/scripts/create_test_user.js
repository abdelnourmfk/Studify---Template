const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME || 'info_7_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  });

  const email = process.argv[2] || 'teacher@example.com';
  const plainPassword = process.argv[3] || 'password123';

  try {
    const client = await pool.connect();
    try {
      const exists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (exists.rows.length > 0) {
        console.log('User already exists:', email);
        return;
      }

      const hashed = await bcrypt.hash(plainPassword, 10);
      const insert = await client.query(
        `INSERT INTO users (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [email, hashed, 'teacher', 'Test', 'Teacher']
      );
      console.log('Created user id', insert.rows[0].id, 'email', email);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating user:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
