const { exec } = require('child_process');
const path = require('path');

/**
 * Scan a file using clamscan/clamd if available. Returns a promise resolving
 * to an object: { ok: boolean, scanned: boolean, reason?: string }
 * If no clamscan is available, returns { skipped: true }
 */
function scanFile(filePath) {
  return new Promise((resolve) => {
    // Prefer clamscan/clamdscan available on PATH
    const scanner = process.env.CLAMAV_SCANNER || 'clamscan';
    const abs = path.resolve(filePath);

    exec(`${scanner} --no-summary ${abs}`, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        // clamscan returns non-zero on infected files; parse stdout
        const out = (stdout || '') + (stderr || '');
        if (/Infected files: [1-9]/.test(out) || /FOUND$/.test(out) || /: .*FOUND/.test(out)) {
          return resolve({ ok: false, scanned: true, reason: 'infected' });
        }
        // If command not found or other error, skip scanning
        return resolve({ skipped: true, detail: err.message });
      }

      // No error -> clean
      resolve({ ok: true, scanned: true });
    });
  });
}

module.exports = { scanFile };
