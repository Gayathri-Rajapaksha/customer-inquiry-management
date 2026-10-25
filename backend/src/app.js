const express = require('express');
const cors = require('cors');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const config = require('./config');
const { pool } = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const inquiryRoutes = require('./routes/inquiry.routes');
const { requireAuth } = require('./middleware/auth');

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) for the frontend
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Configure server-side session management backed by PostgreSQL
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    name: 'customer_inquiry_sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents client-side scripts from accessing session cookie
      secure: config.nodeEnv === 'production', // Use secure cookies over HTTPS in production
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax', // CSRF protection
      maxAge: 1000 * 60 * 60 * 24, // 24-hour session lifetime
    },
  })
);

// Mount authentication routes
app.use('/api/auth', authRoutes);

// Mount inquiry management routes protected by requireAuth middleware
app.use('/api/inquiries', requireAuth, inquiryRoutes);

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Welcome to Customer Inquiry Management API',
    healthCheck: '/api/health',
  });
});

// Health check endpoint required for foundation verification
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Customer Inquiry Management API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// 404 Route handler for unrecognized paths
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error('[Backend Error]:', err.stack || err.message || err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal Server Error' : err.message,
  });
});

module.exports = app;
