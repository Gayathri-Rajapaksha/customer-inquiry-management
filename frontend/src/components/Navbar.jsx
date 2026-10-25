import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, onOpenCreateModal }) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Group */}
        <div className="navbar-brand">
          <div className="navbar-logo-circle">
            <span>☕</span>
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-title">Coffee Ninja</span>
            <span className="navbar-sub">Inquiry Management</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="navbar-nav" aria-label="Main Navigation">
          <button
            id="nav-tab-dashboard"
            type="button"
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab && setActiveTab('dashboard')}
          >
            <span className="nav-icon">📊</span>
            Inquiry Dashboard
          </button>
        </nav>

        {/* User Group & Actions */}
        <div className="navbar-actions">
          <button
            id="header-create-btn"
            type="button"
            className="navbar-create-btn"
            onClick={onOpenCreateModal}
          >
            <span className="plus-icon">+</span> New Inquiry
          </button>

          <div className="user-profile-badge">
            <div className="user-avatar" title={user?.email || 'Staff'}>
              {user?.email ? user.email.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="user-info-text">
              <span className="user-email" title={user?.email}>
                {user?.email || 'staff@coffeeninja.com'}
              </span>
              <span className="user-role-tag">Staff Member</span>
            </div>
          </div>

          <button
            id="logout-btn"
            type="button"
            className="logout-btn"
            onClick={logout}
            title="Sign out of your session"
          >
            <span className="logout-icon">↪</span> Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
