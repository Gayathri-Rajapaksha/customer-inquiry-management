import { useState, useEffect } from 'react';

export default function InquiryDetailModal({
  inquiry,
  isOpen,
  onClose,
  onStatusUpdated,
}) {
  const [currentInquiry, setCurrentInquiry] = useState(inquiry);
  const [selectedStatus, setSelectedStatus] = useState(inquiry?.status || 'New');
  const [updating, setUpdating] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Sync state when inquiry prop updates
  useEffect(() => {
    if (inquiry) {
      setCurrentInquiry(inquiry);
      setSelectedStatus(inquiry.status);
      setMessage(null);
    }
  }, [inquiry]);

  // Fetch the latest fresh record from backend to handle stale data across tabs
  const reloadFreshData = async () => {
    if (!currentInquiry?.id) return;
    setLoadingLatest(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/inquiries/${currentInquiry.id}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Inquiry not found in database');
      }
      setCurrentInquiry(data.inquiry);
      setSelectedStatus(data.inquiry.status);
      setMessage({ type: 'success', text: 'Loaded latest state from database.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to reload latest data.' });
    } finally {
      setLoadingLatest(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !currentInquiry) return null;

  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === currentInquiry.status) return;
    setUpdating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/inquiries/${currentInquiry.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update inquiry status');
      }

      setCurrentInquiry(data.inquiry);
      setSelectedStatus(data.inquiry.status);
      setMessage({
        type: 'success',
        text: `Inquiry #${data.inquiry.id} status updated to "${data.inquiry.status}".`,
      });

      // Notify parent to refresh list
      if (onStatusUpdated) {
        onStatusUpdated(data.inquiry);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Unable to update status. Record may have been modified or removed in another session.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="inquiry-id-tag">#{currentInquiry.id}</span>
            <div>
              <h2 id="detail-title" className="modal-title">
                {currentInquiry.subject}
              </h2>
              <div className="modal-meta-row">
                <span>Status:</span> {getStatusBadge(currentInquiry.status)}
                <span className="dot-divider">•</span>
                <span>Created: {formatDate(currentInquiry.created_at)}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div className={`alert-box alert-${message.type}`} role="alert">
            <span className="alert-icon">{message.type === 'success' ? '✓' : '⚠️'}</span>
            <div className="alert-content">
              <p>{message.text}</p>
            </div>
          </div>
        )}

        <div className="detail-body">
          {/* Status Change Action Section */}
          <section className="status-updater-card">
            <div className="status-updater-header">
              <span className="section-title">Update Status:</span>
              <button
                type="button"
                className="ghost-refresh-btn"
                onClick={reloadFreshData}
                disabled={updating || loadingLatest}
                title="Fetch latest data from PostgreSQL to check for remote updates"
              >
                {loadingLatest ? 'Checking database...' : '🔄 Check for Updates'}
              </button>
            </div>
            <div className="status-buttons-row">
              {['New', 'In Progress', 'Resolved'].map((status) => {
                const isCurrent = currentInquiry.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    className={`status-choice-btn btn-${status.toLowerCase().replace(' ', '-')} ${
                      isCurrent ? 'is-current' : ''
                    }`}
                    onClick={() => handleUpdateStatus(status)}
                    disabled={updating || isCurrent}
                  >
                    {isCurrent ? `✓ ${status}` : `Set to ${status}`}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Customer & Ticket Info Cards */}
          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-card-label">Customer Name</span>
              <span className="detail-card-value font-medium">{currentInquiry.customer_name}</span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">Contact Details</span>
              <span className="detail-card-value">
                {currentInquiry.contact_info.includes('@') ? (
                  <a href={`mailto:${currentInquiry.contact_info}`} className="contact-link">
                    ✉️ {currentInquiry.contact_info}
                  </a>
                ) : (
                  <span className="contact-link">📞 {currentInquiry.contact_info}</span>
                )}
              </span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">Logged By Staff</span>
              <span className="detail-card-value">
                {currentInquiry.creator_email || (currentInquiry.created_by ? `Staff ID #${currentInquiry.created_by}` : 'System Initial Seed')}
              </span>
            </div>

            <div className="detail-card">
              <span className="detail-card-label">Last Updated</span>
              <span className="detail-card-value">{formatDate(currentInquiry.updated_at)}</span>
            </div>
          </div>

          {/* Detailed Description */}
          <div className="description-section">
            <h3 className="section-title">Inquiry Description</h3>
            <div className="description-content">
              {currentInquiry.description}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
