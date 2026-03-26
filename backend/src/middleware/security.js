const rateLimit = require('express-rate-limit');

// General rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Login attempt rate limiter - much stricter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // don't count successful requests
  skipFailedRequests: false // count failed requests
});

// Register attempt rate limiter
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 registrations per hour
  message: 'Too many registration attempts, please try again later.'
});

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  // Tighten CSP: remove 'unsafe-inline' from both scripts and styles.
  // If your frontend relies on inline styles/scripts, switch to nonces or update the frontend to avoid inline code.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' https://cdn.tailwindcss.com; img-src 'self' data: https:; font-src 'self' data:"
  );
  
  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );
  
  // HSTS (HTTPS Strict Transport Security) - uncomment for production
  // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
};

// Sanitize request data
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove potentially dangerous characters
        req.body[key] = req.body[key]
          .trim()
          .replace(/<[^>]*>/g, '') // remove HTML tags
          .substring(0, 500); // limit length
      }
    });
  }
  next();
};

// Session timeout check (no-op when sessions are not used).
// The project uses stateless JWTs; if you switch to server sessions, replace this with the appropriate session store checks.
const sessionTimeoutCheck = (req, res, next) => {
  // If a login time is stored client-side (e.g., sessionStorage), server can't reliably check it for stateless JWTs.
  // Keep this middleware as a no-op to avoid unexpected 401s.
  next();
};

module.exports = {
  limiter,
  loginLimiter,
  registerLimiter,
  securityHeaders,
  sanitizeInput,
  sessionTimeoutCheck
};
