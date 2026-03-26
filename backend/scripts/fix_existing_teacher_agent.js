const pool = require('../src/config/database');

(async () => {
  try {
    const res = await pool.query(
      `UPDATE teachers t
       SET agent_id = sa.agent_id
       FROM specialty_agents sa
       WHERE t.specialty_id = sa.specialty_id
       AND (t.agent_id IS NULL OR t.agent_id = 0)
       RETURNING t.id, t.teacher_id, t.specialty_id, t.agent_id`
    );

    console.log('Updated teachers:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error updating teachers:', err);
    process.exit(1);
  }
})();
