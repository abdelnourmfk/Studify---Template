(async()=>{
  try {
    const base = 'http://localhost:5000';
    const fetch = globalThis.fetch || (await import('node-fetch')).default;

    // Agent login
    const agentEmail = 'agent.informatique@oran1.edu';
    const agentPw = 'root';
    console.log('Agent logging in...');
    let r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: agentEmail, password: agentPw }) });
    if (r.status !== 200) { const t=await r.text(); console.error('Agent login failed', r.status, t); process.exit(2); }
    const agentLogin = await r.json();
    const agentToken = agentLogin.token;
    console.log('Agent token acquired');

    const headersAgent = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + agentToken };

    // Ensure specialty exists
    console.log('Checking specialties');
    r = await fetch(base + '/api/agents/structure/specialties', { headers: headersAgent });
    let specs = await r.json();
    let spec = null;
    if (!specs || (Array.isArray(specs) && specs.length === 0)) {
      console.log('Creating test structure');
      r = await fetch(base + '/api/agents/structure/universities', { method: 'POST', headers: headersAgent, body: JSON.stringify({ name: 'TSU' })});
      const uni = await r.json();
      r = await fetch(base + '/api/agents/structure/faculties', { method: 'POST', headers: headersAgent, body: JSON.stringify({ university_id: uni.id, name: 'TFAC' })});
      const fac = await r.json();
      r = await fetch(base + '/api/agents/structure/specialties', { method: 'POST', headers: headersAgent, body: JSON.stringify({ faculty_id: fac.id, name: 'TSpec', degree_system: 'LMD' })});
      spec = await r.json();
      console.log('Created specialty', spec.id);
    } else {
      spec = Array.isArray(specs) ? specs[0] : specs;
      console.log('Using specialty', spec.id);
    }

    // Create semester
    r = await fetch(base + `/api/agents/specialties/${spec.id}/semesters`, { method: 'POST', headers: headersAgent, body: JSON.stringify({ number: 1 }) });
    const sem = await r.json();
    console.log('Semester id', sem.id);

    // Create module
    r = await fetch(base + `/api/agents/semesters/${sem.id}/modules`, { method: 'POST', headers: headersAgent, body: JSON.stringify({ module_name: 'Smoke Module', coefficient: 2, module_type: 'Core' }) });
    const mod = await r.json();
    console.log('Module id', mod.id);

    // Create teacher
    const rnd = Math.floor(Math.random()*10000)+1000;
    const tEmail = `smoke.teacher.${rnd}@example.com`;
    console.log('Creating teacher', tEmail);
    r = await fetch(base + '/api/agents/teachers/create', { method: 'POST', headers: headersAgent, body: JSON.stringify({ first_name: 'Smoke', last_name: 'Teacher', email: tEmail, specialization: 'Smoke', department: 'QA' }) });
    const teacher = await r.json();
    console.log('Teacher created', teacher.teacher_id);

    // Create course assigned to teacher
    console.log('Creating course assigned to teacher');
    r = await fetch(base + '/api/courses/create', { method: 'POST', headers: headersAgent, body: JSON.stringify({ course_code: `SMOKE-${mod.id}`, course_name: `Smoke Course ${mod.id}`, credits: 3, course_type: 'CM', teacher_id: teacher.teacher_id }) });
    const course = await r.json();
    console.log('Course created id', course.id);

    // Login as teacher
    console.log('Logging in as teacher');
    r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: tEmail, password: teacher.password }) });
    if (r.status !== 200) { const t=await r.text(); console.error('Teacher login failed', r.status, t); process.exit(5); }
    const tLogin = await r.json();
    const tToken = tLogin.token;
    console.log('Teacher token acquired');

    const headersTeacher = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tToken };

    // Publish grades with empty array (smoke test)
    console.log('Calling publish-grades with empty grades array');
    r = await fetch(base + '/api/teachers/publish-grades', { method: 'POST', headers: headersTeacher, body: JSON.stringify({ course_id: course.id, grades: [] }) });
    const pub = await r.json();
    console.log('Publish response:', pub);

    process.exit(0);
  } catch (e) {
    console.error('Smoke script error', e);
    process.exit(10);
  }
})();
