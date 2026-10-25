/**
 * Validation utilities for Coffee Ninja Customer Inquiry Management
 */

/**
 * Validates staff login inputs
 * @param {Object} data - { email, password }
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateLoginForm({ email, password }) {
  const errors = {};
  const trimmedEmail = (email || '').trim();

  if (!trimmedEmail) {
    errors.email = 'Staff email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates customer inquiry creation/update form inputs
 * @param {Object} data - { customer_name, contact_info, subject, description, status }
 * @returns {{ isValid: boolean, errors: Object }}
 */
export function validateInquiryForm({ customer_name, contact_info, subject, description, status }) {
  const errors = {};
  const trimmedName = (customer_name || '').trim();
  const trimmedContact = (contact_info || '').trim();
  const trimmedSubject = (subject || '').trim();
  const trimmedDesc = (description || '').trim();

  if (!trimmedName) {
    errors.customer_name = 'Customer name is required';
  } else if (trimmedName.length > 150) {
    errors.customer_name = 'Customer name cannot exceed 150 characters';
  }

  if (!trimmedContact) {
    errors.contact_info = 'Contact information (email or phone) is required';
  } else if (trimmedContact.length > 255) {
    errors.contact_info = 'Contact info cannot exceed 255 characters';
  }

  if (!trimmedSubject) {
    errors.subject = 'Subject is required';
  } else if (trimmedSubject.length > 200) {
    errors.subject = 'Subject cannot exceed 200 characters';
  }

  if (!trimmedDesc) {
    errors.description = 'Description is required';
  } else if (trimmedDesc.length < 5) {
    errors.description = 'Description must be at least 5 characters long';
  }

  if (status && !['New', 'In Progress', 'Resolved'].includes(status)) {
    errors.status = 'Invalid status. Must be New, In Progress, or Resolved';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Filters an array of inquiries by status and search keyword
 * @param {Array} inquiries
 * @param {Object} filters - { status, search }
 * @returns {Array}
 */
export function filterInquiries(inquiries, { status, search }) {
  if (!Array.isArray(inquiries)) return [];

  return inquiries.filter((item) => {
    // Status check
    if (status && status !== 'All' && item.status !== status) {
      return false;
    }

    // Search check
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      const matchName = (item.customer_name || '').toLowerCase().includes(term);
      const matchContact = (item.contact_info || '').toLowerCase().includes(term);
      const matchSubject = (item.subject || '').toLowerCase().includes(term);
      const matchDesc = (item.description || '').toLowerCase().includes(term);
      return matchName || matchContact || matchSubject || matchDesc;
    }

    return true;
  });
}
