/**
 * Deep-link utilities for Coffee Ninja Customer Inquiry Management
 *
 * Manages URL query parameters for direct inquiry links (e.g. ?inquiry=123)
 * and resolves inquiries while strictly respecting authentication boundaries.
 */

/**
 * Extracts and validates the inquiry ID from a search string or URL
 * @param {string|URLSearchParams} searchOrUrl - e.g. window.location.search or full URL
 * @returns {{ isValid: boolean, rawId: string, id: number|null, error: string|null } | null}
 */
export function parseInquiryIdFromUrl(searchOrUrl) {
  if (!searchOrUrl) return null;

  let params;
  if (typeof searchOrUrl === 'string') {
    try {
      if (searchOrUrl.startsWith('http://') || searchOrUrl.startsWith('https://')) {
        params = new URL(searchOrUrl).searchParams;
      } else {
        const queryIndex = searchOrUrl.indexOf('?');
        const queryString = queryIndex !== -1 ? searchOrUrl.slice(queryIndex) : (searchOrUrl.includes('=') ? `?${searchOrUrl}` : searchOrUrl);
        params = new URLSearchParams(queryString);
      }
    } catch {
      params = new URLSearchParams(searchOrUrl);
    }
  } else if (searchOrUrl instanceof URLSearchParams) {
    params = searchOrUrl;
  } else {
    return null;
  }

  const rawId = params.get('inquiry');
  if (rawId === null || rawId === undefined) return null;

  const trimmed = rawId.trim();
  if (!trimmed) {
    return {
      isValid: false,
      rawId,
      id: null,
      error: 'Inquiry ID cannot be empty',
    };
  }

  // Reject non-numeric characters (must be positive integer digits only)
  if (!/^\d+$/.test(trimmed)) {
    return {
      isValid: false,
      rawId,
      id: null,
      error: 'Inquiry ID must be a positive integer',
    };
  }

  const parsedId = parseInt(trimmed, 10);
  if (parsedId <= 0 || !Number.isSafeInteger(parsedId)) {
    return {
      isValid: false,
      rawId,
      id: null,
      error: 'Inquiry ID must be greater than zero',
    };
  }

  return {
    isValid: true,
    rawId,
    id: parsedId,
    error: null,
  };
}

/**
 * Resolves an inquiry from a deep-link URL parameter.
 * Strictly checks authentication before attempting any retrieval.
 *
 * @param {Object} options
 * @param {string|URLSearchParams} options.searchOrUrl
 * @param {boolean} options.isAuthenticated
 * @param {Function} options.fetchInquiryFn - async (id, signal) => ({ status: number, ok: boolean, data: any })
 * @param {Function} [options.onOpenInquiry] - (inquiry) => void
 * @param {Function} [options.onError] - (errorMessage) => void
 * @param {Function} [options.onClearUrl] - () => void
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ handled: boolean, status: string, inquiry?: Object, message?: string }>}
 */
export async function resolveDeepLinkInquiry({
  searchOrUrl,
  isAuthenticated,
  fetchInquiryFn,
  onOpenInquiry,
  onError,
  onClearUrl,
  signal,
}) {
  // Security Guard: Never attempt fetch or disclose inquiry details if unauthenticated
  if (!isAuthenticated) {
    return {
      handled: false,
      status: 'unauthenticated',
      message: 'Authentication required to view inquiry details',
    };
  }

  const parseResult = parseInquiryIdFromUrl(searchOrUrl);
  if (!parseResult) {
    return {
      handled: false,
      status: 'no_deep_link',
    };
  }

  // Validate format of inquiry ID
  if (!parseResult.isValid) {
    const errorMsg = 'Invalid inquiry ID in URL. Please check the link.';
    if (onError) onError(errorMsg);
    if (onClearUrl) onClearUrl();
    return {
      handled: true,
      status: 'invalid_id',
      message: errorMsg,
    };
  }

  const inquiryId = parseResult.id;

  try {
    const response = await fetchInquiryFn(inquiryId, signal);

    if (response.status === 200 && response.data && response.data.inquiry) {
      if (onOpenInquiry) {
        onOpenInquiry(response.data.inquiry);
      }
      return {
        handled: true,
        status: 'success',
        inquiry: response.data.inquiry,
      };
    }

    if (response.status === 404) {
      const errorMsg = `Inquiry #${inquiryId} not found. It may have been removed or the ID is incorrect.`;
      if (onError) onError(errorMsg);
      if (onClearUrl) onClearUrl();
      return {
        handled: true,
        status: 'not_found',
        message: errorMsg,
      };
    }

    // Server or validation error
    const errorMsg = response.data?.message || `Failed to load inquiry #${inquiryId}`;
    if (onError) onError(errorMsg);
    return {
      handled: true,
      status: 'error',
      message: errorMsg,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        handled: false,
        status: 'aborted',
      };
    }
    const errorMsg = err.message || 'Network error loading inquiry';
    if (onError) onError(errorMsg);
    return {
      handled: true,
      status: 'error',
      message: errorMsg,
    };
  }
}

/**
 * Updates or clears the ?inquiry=<id> query parameter in browser history
 * without triggering a full page reload.
 *
 * @param {number|string|null} inquiryId - Inquiry ID to set, or null/undefined to clear
 */
export function updateInquiryUrlParam(inquiryId) {
  if (typeof window === 'undefined' || !window.location || !window.history) {
    return;
  }

  try {
    const url = new URL(window.location.href);
    if (inquiryId !== null && inquiryId !== undefined && inquiryId !== '') {
      url.searchParams.set('inquiry', String(inquiryId));
    } else {
      url.searchParams.delete('inquiry');
    }
    const updatedUrl = url.pathname + (url.search ? url.search : '');
    window.history.replaceState({}, '', updatedUrl);
  } catch (err) {
    console.error('Failed to update URL search parameters:', err);
  }
}
