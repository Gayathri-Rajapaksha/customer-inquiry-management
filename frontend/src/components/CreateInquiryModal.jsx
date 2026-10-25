import { useState, useEffect } from 'react';
import { validateInquiryForm } from '../utils/validation';

export default function CreateInquiryModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    contact_info: '',
    subject: '',
    description: '',
    status: 'New',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customer_name: '',
        contact_info: '',
        subject: '',
        description: '',
        status: 'New',
      });
      setErrors({});
      setServerError('');
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const result = validateInquiryForm(formData);
    setErrors(result.errors);
    return result.isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create customer inquiry');
      }

      onSuccess(data.inquiry);
      onClose();
    } catch (err) {
      console.error('Error creating inquiry:', err);
      setServerError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-header-icon">📝</span>
            <div>
              <h2 id="modal-title" className="modal-title">Create Customer Inquiry</h2>
              <p className="modal-subtitle">Log a new support ticket, service request, or wholesale inquiry.</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="alert-box alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>Error Submitting Inquiry</strong>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        {/* Inquiry Form */}
        <form onSubmit={handleSubmit} noValidate className="modal-form">
          <div className="form-row-2">
            {/* Customer Name */}
            <div className="form-group">
              <label htmlFor="customer_name" className="form-label">
                Customer Name <span className="required-star">*</span>
              </label>
              <input
                id="customer_name"
                name="customer_name"
                type="text"
                className={`form-input ${errors.customer_name ? 'input-error' : ''}`}
                placeholder="e.g. Marcus Vance"
                value={formData.customer_name}
                onChange={handleChange}
                maxLength={150}
                disabled={submitting}
                autoFocus
              />
              {errors.customer_name && (
                <span className="field-error-msg">{errors.customer_name}</span>
              )}
            </div>

            {/* Contact Information */}
            <div className="form-group">
              <label htmlFor="contact_info" className="form-label">
                Contact Details (Email or Phone) <span className="required-star">*</span>
              </label>
              <input
                id="contact_info"
                name="contact_info"
                type="text"
                className={`form-input ${errors.contact_info ? 'input-error' : ''}`}
                placeholder="e.g. marcus@cafevoyage.com or +1 555-0192"
                value={formData.contact_info}
                onChange={handleChange}
                maxLength={255}
                disabled={submitting}
              />
              {errors.contact_info && (
                <span className="field-error-msg">{errors.contact_info}</span>
              )}
            </div>
          </div>

          <div className="form-row-2">
            {/* Subject */}
            <div className="form-group flex-2">
              <label htmlFor="subject" className="form-label">
                Subject / Title <span className="required-star">*</span>
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                className={`form-input ${errors.subject ? 'input-error' : ''}`}
                placeholder="e.g. Wholesale Bean Roasting Volume Quote"
                value={formData.subject}
                onChange={handleChange}
                maxLength={200}
                disabled={submitting}
              />
              {errors.subject && (
                <span className="field-error-msg">{errors.subject}</span>
              )}
            </div>

            {/* Initial Status */}
            <div className="form-group flex-1">
              <label htmlFor="status" className="form-label">
                Initial Status
              </label>
              <select
                id="status"
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <div className="form-label-with-count">
              <label htmlFor="description" className="form-label">
                Detailed Inquiry Description <span className="required-star">*</span>
              </label>
              <span className="char-count">{formData.description.length} characters</span>
            </div>
            <textarea
              id="description"
              name="description"
              rows={4}
              className={`form-textarea ${errors.description ? 'input-error' : ''}`}
              placeholder="Provide complete details regarding the customer's request, order specifications, or equipment issues..."
              value={formData.description}
              onChange={handleChange}
              disabled={submitting}
            />
            {errors.description && (
              <span className="field-error-msg">{errors.description}</span>
            )}
          </div>

          {/* Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              id="submit-create-inquiry-btn"
              type="submit"
              className="primary-btn"
              disabled={submitting}
            >
              {submitting ? 'Saving to Database...' : 'Create Customer Inquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
