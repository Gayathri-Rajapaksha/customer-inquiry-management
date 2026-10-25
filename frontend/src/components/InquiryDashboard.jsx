import { useState, useEffect, useCallback } from 'react';

export default function InquiryDashboard({
  onSelectInquiry,
  onOpenCreateModal,
  refreshTrigger,
}) {
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, inProgress: 0, resolved: 0 });
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch inquiries from backend API with optional search and status parameters
  const fetchInquiries = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'All') {
        params.append('status', statusFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const [inquiriesRes, statsRes] = await Promise.all([
        fetch(`/api/inquiries?${params.toString()}`, {
          headers: { 'Accept': 'application/json' },
        }),
        fetch('/api/inquiries/stats', {
          headers: { 'Accept': 'application/json' },
        }),
      ]);

      if (!inquiriesRes.ok) {
        const errorData = await inquiriesRes.json();
        throw new Error(errorData.message || 'Failed to load inquiries');
      }

      const inquiriesData = await inquiriesRes.json();
      setInquiries(inquiriesData.inquiries || []);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || { total: 0, new: 0, inProgress: 0, resolved: 0 });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'An error occurred while fetching inquiries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery]);

  // Initial fetch and when filters or external trigger change
  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries, refreshTrigger]);

  // Format timestamp nicely
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper for status badge classes
  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="status-badge badge-new">New</span>;
      case 'In Progress':
        return <span className="status-badge badge-in-progress">In Progress</span>;
      case 'Resolved':
        return <span className="status-badge badge-resolved">Resolved</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="dashboard-content">
      {/* Dashboard Top Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Customer Inquiry Desk</h1>
          <p className="dashboard-subtitle">
            Manage, triage, and track customer inquiries, wholesale requests, and equipment service tickets.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button
            id="refresh-btn"
            type="button"
            className="secondary-btn"
            onClick={() => fetchInquiries(true)}
            disabled={loading || refreshing}
            title="Refresh inquiry data from database"
          >
            <span className={`refresh-icon ${refreshing ? 'spinning' : ''}`}>🔄</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            id="dashboard-new-inquiry-btn"
            type="button"
            className="primary-btn"
            onClick={onOpenCreateModal}
          >
            <span className="plus-icon">+</span> New Inquiry
          </button>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="stats-grid">
        <div
          className={`stat-card ${statusFilter === 'All' ? 'stat-active' : ''}`}
          onClick={() => setStatusFilter('All')}
          role="button"
          tabIndex={0}
          title="Click to view all inquiries"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Total Inquiries</span>
            <span className="stat-card-icon icon-total">📋</span>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-footer">All logged records</div>
        </div>

        <div
          className={`stat-card ${statusFilter === 'New' ? 'stat-active' : ''}`}
          onClick={() => setStatusFilter('New')}
          role="button"
          tabIndex={0}
          title="Click to filter by New status"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">New</span>
            <span className="stat-card-icon icon-new">✨</span>
          </div>
          <div className="stat-card-value value-new">{stats.new}</div>
          <div className="stat-card-footer">Awaiting staff review</div>
        </div>

        <div
          className={`stat-card ${statusFilter === 'In Progress' ? 'stat-active' : ''}`}
          onClick={() => setStatusFilter('In Progress')}
          role="button"
          tabIndex={0}
          title="Click to filter by In Progress status"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">In Progress</span>
            <span className="stat-card-icon icon-progress">⏳</span>
          </div>
          <div className="stat-card-value value-progress">{stats.inProgress}</div>
          <div className="stat-card-footer">Currently being handled</div>
        </div>

        <div
          className={`stat-card ${statusFilter === 'Resolved' ? 'stat-active' : ''}`}
          onClick={() => setStatusFilter('Resolved')}
          role="button"
          tabIndex={0}
          title="Click to filter by Resolved status"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Resolved</span>
            <span className="stat-card-icon icon-resolved">✅</span>
          </div>
          <div className="stat-card-value value-resolved">{stats.resolved}</div>
          <div className="stat-card-footer">Successfully completed</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-panel">
        {/* Status Filter Tabs */}
        <div className="status-tabs" role="tablist">
          {['All', 'New', 'In Progress', 'Resolved'].map((status) => (
            <button
              key={status}
              type="button"
              className={`status-tab ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
              role="tab"
              aria-selected={statusFilter === status}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="search-bar-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="inquiry-search-input"
            type="text"
            className="search-input"
            placeholder="Search by customer, contact, subject, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Table / State Container */}
      <div className="table-card">
        {/* Error State */}
        {error && (
          <div className="table-error-state" role="alert">
            <div className="error-icon">⚠️</div>
            <h3>Failed to Load Inquiries</h3>
            <p>{error}</p>
            <button
              type="button"
              className="primary-btn"
              onClick={() => fetchInquiries()}
            >
              Retry Loading
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="table-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading inquiries from PostgreSQL database...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && inquiries.length === 0 && (
          <div className="table-empty-state">
            <div className="empty-icon">📭</div>
            <h3>No Inquiries Found</h3>
            <p>
              {searchQuery || statusFilter !== 'All'
                ? 'No inquiries match your current search and status filters. Try clearing your filters.'
                : 'There are currently no customer inquiries in the system. Get started by creating one!'}
            </p>
            <div className="empty-actions">
              {(searchQuery || statusFilter !== 'All') && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                  }}
                >
                  Clear All Filters
                </button>
              )}
              <button
                type="button"
                className="primary-btn"
                onClick={onOpenCreateModal}
              >
                + Create New Inquiry
              </button>
            </div>
          </div>
        )}

        {/* Inquiries Table */}
        {!loading && !error && inquiries.length > 0 && (
          <div className="table-responsive">
            <table className="inquiries-table" aria-label="Customer Inquiries List">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '70px' }}>ID</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Contact Details</th>
                  <th scope="col">Subject</th>
                  <th scope="col" style={{ width: '130px' }}>Status</th>
                  <th scope="col">Created At</th>
                  <th scope="col" style={{ width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    className="inquiry-row"
                    onClick={() => onSelectInquiry(inquiry)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSelectInquiry(inquiry);
                    }}
                  >
                    <td className="cell-id">#{inquiry.id}</td>
                    <td className="cell-customer">
                      <div className="customer-name-text">{inquiry.customer_name}</div>
                    </td>
                    <td className="cell-contact">
                      <span className="contact-info-text">{inquiry.contact_info}</span>
                    </td>
                    <td className="cell-subject">
                      <div className="subject-text" title={inquiry.subject}>
                        {inquiry.subject}
                      </div>
                      <div className="desc-preview" title={inquiry.description}>
                        {inquiry.description}
                      </div>
                    </td>
                    <td className="cell-status">{getStatusBadge(inquiry.status)}</td>
                    <td className="cell-date">
                      <span className="date-text">{formatDate(inquiry.created_at)}</span>
                    </td>
                    <td className="cell-actions" style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInquiry(inquiry);
                        }}
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer-info">
              Showing {inquiries.length} {inquiries.length === 1 ? 'inquiry' : 'inquiries'}
              {statusFilter !== 'All' && ` with status "${statusFilter}"`}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
