const pool = require('../src/config/database');

(async () => {
  try {
    const specialtyId = parseInt(process.argv[2], 10) || 1; // default to 1 (Informatique)
    const agentDbId = parseInt(process.argv[3], 10) || 3; // default to 3 (seeded principal)

    const res = await pool.query(
      `INSERT INTO specialty_agents (specialty_id, agent_id) VALUES ($1, $2) ON CONFLICT (specialty_id) DO UPDATE SET agent_id = EXCLUDED.agent_id RETURNING *`,
      [specialtyId, agentDbId]
    );

    console.log('Mapped specialty to agent:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Failed to map specialty to agent:', err);
    process.exit(1);
  }
})();
