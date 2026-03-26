const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Route imports
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const teacherRoutes = require('./routes/teachers');
const agentRoutes = require('./routes/agents');
const gradeRoutes = require('./routes/grades');
const scheduleRoutes = require('./routes/schedule');
const courseRoutes = require('./routes/courses');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const { initializeDatabase } = require('./config/migration');
const { securityHeaders, sanitizeInput, limiter } = require('./middleware/security');

const app = express();

// Security - Set HTTP headers
app.use(helmet());

// CORS with strict origin validation
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
}));

// Apply security headers
app.use(securityHeaders);

// Body parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser for httpOnly token cookies
app.use(cookieParser());

// Input sanitization
app.use(sanitizeInput);

// General rate limiting for all requests
app.use('/api/', limiter);

// Ensure private uploads directory exists and do NOT serve it as static public files.
const fs = require('fs');
const UPLOADS_DIR = process.env.UPLOADS_DIR || 'uploads_private';
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`Uploads directory ready: ${UPLOADS_DIR}`);
} catch (e) {
  console.error('Could not create uploads directory:', e.message);
}

// NOTE: uploads are stored in a private directory and must be served
// via protected endpoints (see routes/teachers.js). Do not expose
// this directory via `express.static` in production.

// Initialize Database
initializeDatabase().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root - friendly landing for browser requests
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Info7 Backend</title></head>
      <body style="font-family: Arial, Helvetica, sans-serif; padding: 24px;">
        <h1>Info7 Backend</h1>
        <p>API is available under <a href="/api/health">/api/health</a> and <a href="/api/">/api/</a> routes.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});
// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  
  // Rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: err.retryAfter
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication token has expired. Please login again.'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message || 'Internal Server Error',
    timestamp: new Date()
  });
});

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// expose io to routes via app
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔒 Security middleware enabled`);
  console.log(`🔗 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
