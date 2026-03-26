const fetch = globalThis.fetch || require('node-fetch');

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:5000';
  try {
    const res = await fetch(`${base}/api/health`);
    if (!res.ok) {
      console.error('Health check failed:', res.status, await res.text());
      process.exit(2);
    }
    const data = await res.json();
    console.log('Health OK:', data);
    process.exit(0);
  } catch (err) {
    console.error('Smoke test error:', err.message || err);
    process.exit(1);
  }
})();
