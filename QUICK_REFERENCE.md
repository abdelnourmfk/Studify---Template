# 🚀 INFO_7 Quick Reference Guide

## Frontend Setup & Usage

### Navbar Integration
```jsx
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(null);

  return (
    <>
      {user && <Navbar user={user} onLogout={() => setUser(null)} />}
      {/* Your routes */}
    </>
  );
}
```

### Login Page Features
```jsx
// Features available:
✅ Password strength indicator (3 levels)
✅ Email validation with regex
✅ Failed attempt counter (max 5)
✅ Show/hide password toggle
✅ Demo credentials display
✅ Animated background
✅ Session storage management

// Environmental variable needed:
REACT_APP_API_URL=http://localhost:5000
```

### Using Animations
```jsx
// Add animations to elements
<div className="animate-fadeInUp">Fades in and slides up</div>
<div className="animate-slideInLeft">Slides from left</div>
<div className="animate-scaleIn">Scales from center</div>

// For buttons
<button className="btn-hover">Scales on hover</button>

// For cards
<div className="card-hover">Lifts on hover</div>

// Custom animations in index.css
.my-custom-animation {
  animation: fadeInUp 0.5s ease-out;
}
```

### Building Custom Components
```jsx
// Use glass-morphism effect
<div className="glass rounded-2xl p-8">
  Glass effect background
</div>

// Use gradients
<div className="bg-gradient-to-r from-blue-600 to-blue-800">
  Gradient background
</div>

// Use animations
<div className="animate-fadeIn">
  Fades in on mount
</div>

// Responsive layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Mobile: 1 column
  Tablet: 2 columns
  Desktop: 3 columns
</div>
```

---

## Backend Security Implementation

### Protected Routes
```javascript
const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');

// Public route
router.get('/public', (req, res) => {
  res.json({ data: 'public' });
});

// Protected route (any role)
router.get('/protected', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Role-based protected route
router.get('/admin-only', 
  verifyToken, 
  verifyRole(['agent']), 
  (req, res) => {
    res.json({ data: 'admin only' });
  }
);
```

### Rate Limiting
```javascript
const express = require('express');
const { loginLimiter, registerLimiter } = require('../middleware/security');

router.post('/login', loginLimiter, (req, res) => {
  // Max 5 failed attempts per 15 minutes
});

router.post('/register', registerLimiter, (req, res) => {
  // Max 5 registrations per hour
});
```

### Input Validation
```javascript
const { body, validationResult } = require('express-validator');

router.post('/submit', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  body('role').isIn(['student', 'teacher', 'agent'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  
  // Process request
});
```

### Error Handling
```javascript
// Global error handler (in server.js)
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Token expired
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Session expired' });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Server error' 
      : err.message
  });
});
```

---

## Database Transactions

### Atomic Operations
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // Multiple operations
  await client.query('INSERT INTO users ...', [data]);
  await client.query('INSERT INTO students ...', [studentData]);
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

## Environment Variables

### Frontend (.env.local)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

### Backend (.env)
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=info_7_db
DB_USER=postgres
DB_PASSWORD=root

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

## API Endpoint Reference

### Authentication Endpoints
```
POST /api/auth/register
  - Rate limited: 5 per hour
  - Body: { email, password, first_name, last_name, role }
  - Returns: { token, user, expiresIn }

POST /api/auth/login
  - Rate limited: 5 failed attempts per 15 min
  - Body: { email, password }
  - Returns: { token, user, expiresIn }

POST /api/auth/change-password
  - Requires: Authorization header
  - Body: { currentPassword, newPassword }
  - Returns: { message }

POST /api/auth/logout
  - Requires: Authorization header
  - Returns: { message, timestamp }
```

### Protected Endpoints (require token)
```
All endpoints require:
Authorization: Bearer <JWT_TOKEN>

Student routes: /api/students/*
Teacher routes: /api/teachers/*
Agent routes: /api/agents/*
Grades routes: /api/grades/*
Schedule routes: /api/schedule/*
Courses routes: /api/courses/*
Notifications routes: /api/notifications/*
```

### Security Headers
```
All responses include:
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Permissions-Policy (geolocation, microphone, camera disabled)
- Referrer-Policy: strict-origin-when-cross-origin
```

---

## Testing Security Features

### Test Rate Limiting
```bash
# Test login rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# After 5 attempts: "Too many login attempts"
```

### Test Security Headers
```bash
curl -i http://localhost:5000/api/health
# Check headers in response
```

### Test CORS
```javascript
// From different origin
fetch('http://localhost:5000/api/health', {
  method: 'GET',
  credentials: 'include'
})
.then(r => r.json())
.catch(e => console.error('CORS error:', e))
```

### Test Input Sanitization
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","first_name":"<script>alert(1)</script>","last_name":"test","role":"student"}'
# HTML tags will be removed
```

---

## Common Tasks

### Add a New Protected Route
```javascript
// 1. Create route file: routes/myroute.js
const express = require('express');
const router = express.Router();
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/my-data', verifyToken, async (req, res) => {
  const userId = req.user.id;
  // Fetch and return data
});

module.exports = router;

// 2. Register in server.js
const myRoutes = require('./routes/myroute');
app.use('/api/myroute', myRoutes);

// 3. Test with token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/myroute/my-data
```

### Add Input Validation
```javascript
const { body, validationResult } = require('express-validator');

const validateUserInput = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Min 6 chars'),
  body('name').trim().notEmpty().withMessage('Name required')
];

router.post('/submit', validateUserInput, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process valid data
});
```

### Implement Custom Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const customLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 requests per windowMs
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/custom-endpoint', customLimiter, (req, res) => {
  // Route handler
});
```

### Add Logging
```javascript
// Log security events
console.log(`[${new Date().toISOString()}] Login attempt for: ${email}`);
console.warn(`[${new Date().toISOString()}] Failed attempt for: ${email}`);
console.error(`[${new Date().toISOString()}] Error:`, error);
```

---

## Debugging Tips

### Check Security Headers
```bash
curl -i -X OPTIONS http://localhost:5000/api/health
# Look for security headers in response
```

### Check CORS
```bash
# Set different origin
curl -H "Origin: http://evil.com" -i http://localhost:5000/api/health
# Should be blocked or restricted
```

### Check Rate Limiting
```bash
# Check rate limit headers
curl -i http://localhost:5000/api/health
# Look for: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
```

### Check JWT Token
```javascript
// Decode token (client-side)
const token = localStorage.getItem('token');
const parts = token.split('.');
const decoded = JSON.parse(atob(parts[1]));
console.log('Token decoded:', decoded);
```

### Check Database Connection
```javascript
// In server.js or any route handler
pool.query('SELECT NOW()', (err, result) => {
  if (err) console.error('DB error:', err);
  else console.log('DB time:', result.rows[0]);
});
```

---

## Performance Optimization

### Frontend
```
✅ Use React.memo() for static components
✅ Use useCallback() for expensive functions
✅ Lazy load routes with React.lazy()
✅ Cache API responses
✅ Use debounce for search inputs
✅ Optimize images
✅ Enable compression
```

### Backend
```
✅ Use connection pooling (already done)
✅ Add database indexes on frequently queried columns
✅ Implement response caching
✅ Use pagination for large datasets
✅ Monitor slow queries
✅ Optimize database queries
```

---

## Deployment Quick Checklist

### Before Production
- [ ] Set NODE_ENV=production
- [ ] Change JWT_SECRET to secure value
- [ ] Update FRONTEND_URL to production domain
- [ ] Enable HTTPS/SSL
- [ ] Setup database backups
- [ ] Run npm audit
- [ ] Test all endpoints
- [ ] Load test the app
- [ ] Security audit

### Production .env
```
DB_HOST=prod-db-server
DB_USER=prod_user
DB_PASSWORD=<secure_password>
JWT_SECRET=<very_long_random_string>
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
PORT=5000
```

### Nginx Configuration (Example)
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location / {
        root /path/to/frontend/build;
        try_files $uri /index.html;
    }
}
```

---

## FAQ

### Q: How do I reset a user password?
A: User should use "Forgot Password" feature (or admin can via database):
```sql
UPDATE users SET password_hash = '<new_bcrypt_hash>' WHERE id = <user_id>;
```

### Q: How do I check login attempts?
A: Review backend logs or add custom logging:
```javascript
// In auth.js
console.log(`Failed login for: ${email} at ${new Date()}`);
```

### Q: How do I extend JWT expiry?
A: Edit in auth.js:
```javascript
{ expiresIn: '14d' } // Change from 7d to 14d
```

### Q: How do I disable rate limiting?
A: Remove limiter middleware (NOT recommended for production):
```javascript
// Comment out: app.use('/api/', limiter);
```

### Q: How do I add 2FA?
A: Install speakeasy:
```bash
npm install speakeasy qrcode
# Then implement in auth routes
```

---

## Helpful Resources

### Documentation Files
- `SECURITY.md` - Complete security documentation
- `DESIGN_SYSTEM.md` - Design guidelines
- `README.md` - Project overview
- `QUICKSTART.md` - Quick setup guide

### External Resources
- **bcryptjs**: https://www.npmjs.com/package/bcryptjs
- **JWT**: https://jwt.io
- **Express Security**: https://expressjs.com/en/advanced/best-practice-security.html
- **OWASP**: https://owasp.org/www-project-top-ten/
- **Tailwind CSS**: https://tailwindcss.com

---

## Support

For issues or questions:
1. Check documentation files
2. Review backend logs
3. Check browser console
4. Verify environment variables
5. Test endpoints with curl/Postman
6. Run npm audit

---

**Happy Coding! 🚀**

Last Updated: February 16, 2026
