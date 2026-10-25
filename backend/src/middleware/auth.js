/**
 * Authentication Middleware
 *
 * Protects private endpoints by checking whether an authenticated session exists.
 * If the session is missing or invalid, returns a 401 Unauthorized JSON response.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.id) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Authentication required',
    });
  }
  next();
}

module.exports = {
  requireAuth,
};
