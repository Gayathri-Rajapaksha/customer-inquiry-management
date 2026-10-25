import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { validateLoginForm } from '../utils/validation';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const result = validateLoginForm({ email, password });
    setErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setServerError(err.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="brand-logo-circle">
            <span className="coffee-icon">☕</span>
          </div>
          <h1 className="brand-title">Coffee Ninja</h1>
          <p className="brand-subtitle">Customer Inquiry Management System</p>
          <div className="staff-portal-badge">Staff Access Portal</div>
        </div>

        {/* Login Form Card */}
        <div className="login-card">
          <h2 className="login-card-title">Sign In to Your Account</h2>
          <p className="login-card-desc">
            Authorized staff access to manage customer inquiries, support requests, and service escalations.
          </p>

          {/* Server Error Alert */}
          {serverError && (
            <div className="alert-box alert-error" role="alert" id="login-error-alert">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <strong>Authentication Failed</strong>
                <p>{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="staff-email" className="form-label">
                Staff Email Address <span className="required-star">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">✉️</span>
                <input
                  id="staff-email"
                  type="email"
                  className={`form-input ${errors.email ? 'input-error' : ''}`}
                  placeholder="admin@coffeeninja.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  disabled={submitting}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {errors.email && (
                <span className="field-error-msg" id="email-error-msg">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="staff-password" className="form-label">
                Password <span className="required-star">*</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter staff password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  disabled={submitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              {errors.password && (
                <span className="field-error-msg" id="password-error-msg">
                  {errors.password}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              className="primary-btn login-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-icon"></span> Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <p>© 2026 Coffee Ninja Inc. All rights reserved. Secure staff session management.</p>
        </div>
      </div>
    </div>
  );
}
