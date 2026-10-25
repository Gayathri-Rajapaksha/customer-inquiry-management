const express = require('express');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticates a staff user and establishes a server-side session.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate presence and type of email and password
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query staff user using safe parameterized SQL ($1 placeholder)
    const result = await query(
      'SELECT id, email, password_hash FROM staff_users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    const staffUser = result.rows[0];

    // Generic error message to prevent user enumeration attacks
    const invalidCredentialsMessage = 'Invalid email or password';

    if (!staffUser) {
      return res.status(401).json({
        status: 'error',
        message: invalidCredentialsMessage,
      });
    }

    // Compare supplied password with bcrypt password hash
    const isMatch = await bcrypt.compare(password, staffUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: invalidCredentialsMessage,
      });
    }

    // Regenerate session to protect against session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        return next(err);
      }

      // Store authenticated user information in the session
      req.session.user = {
        id: staffUser.id,
        email: staffUser.email,
      };

      return res.status(200).json({
        status: 'ok',
        message: 'Login successful',
        user: {
          id: staffUser.id,
          email: staffUser.email,
        },
      });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Destroys the active session and clears the session cookie.
 */
router.post('/logout', (req, res, next) => {
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  };

  // If no user is logged in, return success immediately
  if (!req.session || !req.session.user) {
    res.clearCookie('customer_inquiry_sid', cookieOptions);
    return res.status(200).json({
      status: 'ok',
      message: 'Logged out successfully',
    });
  }

  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie('customer_inquiry_sid', cookieOptions);
    return res.status(200).json({
      status: 'ok',
      message: 'Logged out successfully',
    });
  });
});

/**
 * GET /api/auth/me
 * Returns information about the currently logged-in staff user.
 * Protected by requireAuth middleware.
 */
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({
    status: 'ok',
    user: req.session.user,
  });
});

module.exports = router;
