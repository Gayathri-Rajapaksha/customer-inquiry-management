import { useState, useEffect } from 'react';

export default function SystemDiagnostics() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to fetch health check from the Express backend
  const checkBackendHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to connect to backend:', err);
      setError(err.message || 'Unable to connect to backend server');
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  // Perform a health check automatically on initial mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="diagnostics-container">
      <div className="diagnostics-header">
        <h1 className="diagnostics-title">System Diagnostics & Environment Foundation</h1>
        <p className="diagnostics-subtitle">
          Development diagnostic verification for PostgreSQL connection, Express REST API, and session services.
        </p>
      </div>

      <div className="diagnostics-grid">
        {/* Backend Health Check Card */}
        <section className="card health-card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="icon">⚡</span>
              <h2>Backend API Health Check</h2>
            </div>
            <div className="status-badge-container">
              {loading && <span className="status-pill status-loading">Checking...</span>}
              {!loading && healthData && (
                <span className="status-pill status-online">Connected (200 OK)</span>
              )}
              {!loading && error && (
                <span className="status-pill status-offline">Backend Offline</span>
              )}
            </div>
          </div>

          <p className="card-desc">
            Tests the <code>GET /api/health</code> endpoint to confirm that the Express server
            is running and reachable through the Vite development proxy.
          </p>

          <div className="action-row">
            <button
              id="check-health-btn"
              type="button"
              className="primary-btn"
              onClick={checkBackendHealth}
              disabled={loading}
            >
              {loading ? 'Testing Connection...' : 'Re-check Backend Health'}
            </button>
            <span className="endpoint-tag">GET /api/health</span>
          </div>

          {/* Response Display */}
          <div className="response-box">
            <div className="response-box-header">
              <span>Server Response:</span>
            </div>
            {loading && <p className="status-text">Pinging backend server...</p>}
            {error && (
              <div className="error-box">
                <strong>Connection Error:</strong> {error}
                <p className="tip-text">
                  Make sure the backend is running on <code>http://localhost:5000</code> with{' '}
                  <code>npm run dev</code> inside <code>/backend</code>.
                </p>
              </div>
            )}
            {healthData && (
              <pre className="json-output">{JSON.stringify(healthData, null, 2)}</pre>
            )}
          </div>
        </section>

        {/* Foundation Architecture Checklist */}
        <section className="card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="icon">📋</span>
              <h2>Assessment Technical Requirements</h2>
            </div>
          </div>
          <ul className="checklist">
            <li className="check-item completed">
              <span className="check-icon">✓</span>
              <div>
                <strong>Staff Authentication:</strong> PostgreSQL session-backed login, logout, and protected routes with bcryptjs.
              </div>
            </li>
            <li className="check-item completed">
              <span className="check-icon">✓</span>
              <div>
                <strong>Inquiry Dashboard:</strong> Real-time inquiry counts, search filtering, and status categorization from PostgreSQL.
              </div>
            </li>
            <li className="check-item completed">
              <span className="check-icon">✓</span>
              <div>
                <strong>Create Inquiries:</strong> Validated customer name, contact details, subject, and description saved to database.
              </div>
            </li>
            <li className="check-item completed">
              <span className="check-icon">✓</span>
              <div>
                <strong>View & Update Status:</strong> Full inquiry detail view with interactive status updates (New, In Progress, Resolved).
              </div>
            </li>
            <li className="check-item completed">
              <span className="check-icon">✓</span>
              <div>
                <strong>Backend Security:</strong> Parameterized SQL, session cookies, route protection, and comprehensive automated tests.
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
