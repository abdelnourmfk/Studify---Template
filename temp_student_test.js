(async()=>{
  try {
    const base = 'http://localhost:5000';
    const fetch = globalThis.fetch || (await import('node-fetch')).default;

    const email = `smoke.student.${Date.now()}@example.com`;
    const password = 'Test1234';
    console.log('Registering student:', email);

    let r = await fetch(base + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, first_name: 'Smoke', last_name: 'Student', role: 'student', filiere: 'TestF', level: '1' }) });
    const reg = await r.json();
    if (r.status !== 201) { console.error('Register failed', r.status, reg); process.exit(2); }
    console.log('Registered. Token received. Fetching student dashboard...');

    const token = reg.token;
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

    r = await fetch(base + '/api/students/dashboard', { headers });
    const dash = await r.json();
    console.log('Dashboard response:', JSON.stringify(dash, null, 2));

    process.exit(0);
  } catch (e) {
    console.error('Test error', e);
    process.exit(10);
  }
})();
