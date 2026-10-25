import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseInquiryIdFromUrl,
  resolveDeepLinkInquiry,
} from '../src/utils/deepLink.js';

describe('Frontend Deep-Link Handling & Direct Inquiry URLs', () => {
  const mockInquiry = {
    id: 1,
    customer_name: 'Sarah Jenkins',
    contact_info: 'sarah.jenkins@peakroasters.com',
    subject: 'Wholesale Espresso Beans Inquiry',
    description: 'Bulk discount rates for 50kg monthly orders.',
    status: 'New',
    created_at: '2026-10-24T10:00:00.000Z',
    updated_at: '2026-10-24T10:00:00.000Z',
    creator_email: 'admin@coffeeninja.com',
  };

  describe('URL Parameter Parsing (parseInquiryIdFromUrl)', () => {
    it('should return null when inquiry parameter is missing', () => {
      assert.strictEqual(parseInquiryIdFromUrl(''), null);
      assert.strictEqual(parseInquiryIdFromUrl('?status=New'), null);
      assert.strictEqual(parseInquiryIdFromUrl('http://localhost:5173/'), null);
    });

    it('should parse valid positive integer inquiry IDs', () => {
      const res1 = parseInquiryIdFromUrl('?inquiry=1');
      assert.strictEqual(res1.isValid, true);
      assert.strictEqual(res1.id, 1);

      const res2 = parseInquiryIdFromUrl('http://localhost:5173/?inquiry=42&status=All');
      assert.strictEqual(res2.isValid, true);
      assert.strictEqual(res2.id, 42);
    });

    it('should flag empty inquiry parameter as invalid', () => {
      const res = parseInquiryIdFromUrl('?inquiry=');
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.id, null);
    });

    it('should flag non-numeric values as invalid', () => {
      const res1 = parseInquiryIdFromUrl('?inquiry=abc');
      assert.strictEqual(res1.isValid, false);

      const res2 = parseInquiryIdFromUrl('?inquiry=12abc');
      assert.strictEqual(res2.isValid, false);

      const res3 = parseInquiryIdFromUrl('?inquiry=1.5');
      assert.strictEqual(res3.isValid, false);
    });

    it('should flag zero and negative values as invalid', () => {
      const res1 = parseInquiryIdFromUrl('?inquiry=0');
      assert.strictEqual(res1.isValid, false);

      const res2 = parseInquiryIdFromUrl('?inquiry=-5');
      assert.strictEqual(res2.isValid, false);
    });
  });

  describe('Deep-Link Resolution & Security Rules (resolveDeepLinkInquiry)', () => {
    // Requirement 9.4: Ensuring inquiry details are not displayed before authentication succeeds
    it('should ensure inquiry details are not fetched or displayed before authentication succeeds', async () => {
      let fetchCalled = false;
      let openCalled = false;
      let errorCalled = false;

      const result = await resolveDeepLinkInquiry({
        searchOrUrl: '?inquiry=1',
        isAuthenticated: false, // Unauthenticated user
        fetchInquiryFn: async () => {
          fetchCalled = true;
          return { status: 200, ok: true, data: { inquiry: mockInquiry } };
        },
        onOpenInquiry: () => {
          openCalled = true;
        },
        onError: () => {
          errorCalled = true;
        },
      });

      assert.strictEqual(result.handled, false);
      assert.strictEqual(result.status, 'unauthenticated');
      assert.strictEqual(fetchCalled, false, 'API request must NOT be issued when unauthenticated');
      assert.strictEqual(openCalled, false, 'Inquiry detail view must NOT be opened when unauthenticated');
      assert.strictEqual(errorCalled, false);
    });

    // Requirement 9.1: Opening an existing inquiry through a direct URL
    it('should open an existing inquiry through a direct URL when authenticated', async () => {
      let openedInquiry = null;
      let requestedId = null;

      const result = await resolveDeepLinkInquiry({
        searchOrUrl: '?inquiry=1',
        isAuthenticated: true,
        fetchInquiryFn: async (id) => {
          requestedId = id;
          return { status: 200, ok: true, data: { inquiry: mockInquiry } };
        },
        onOpenInquiry: (inquiry) => {
          openedInquiry = inquiry;
        },
      });

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.status, 'success');
      assert.strictEqual(requestedId, 1);
      assert.deepStrictEqual(openedInquiry, mockInquiry, 'Inquiry detail modal must receive full inquiry data');
    });

    // Requirement 9.2: Handling a nonexistent inquiry
    it('should handle a nonexistent inquiry gracefully with user-friendly message', async () => {
      let errorMessage = null;
      let urlCleared = false;
      let openCalled = false;

      const result = await resolveDeepLinkInquiry({
        searchOrUrl: '?inquiry=999999',
        isAuthenticated: true,
        fetchInquiryFn: async () => {
          return { status: 404, ok: false, data: { message: 'Inquiry with ID 999999 not found' } };
        },
        onOpenInquiry: () => {
          openCalled = true;
        },
        onError: (msg) => {
          errorMessage = msg;
        },
        onClearUrl: () => {
          urlCleared = true;
        },
      });

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.status, 'not_found');
      assert.strictEqual(openCalled, false, 'Modal must NOT be opened for nonexistent inquiry');
      assert.ok(errorMessage && errorMessage.includes('not found'), 'Must present clear not-found message');
      assert.strictEqual(urlCleared, true, 'Invalid inquiry param must be cleared from URL');
    });

    // Requirement 9.3: Handling an invalid inquiry ID
    it('should handle an invalid inquiry ID gracefully without sending API requests', async () => {
      let fetchCalled = false;
      let errorMessage = null;
      let urlCleared = false;
      let openCalled = false;

      const result = await resolveDeepLinkInquiry({
        searchOrUrl: '?inquiry=not-a-number',
        isAuthenticated: true,
        fetchInquiryFn: async () => {
          fetchCalled = true;
          return { status: 200, ok: true, data: { inquiry: mockInquiry } };
        },
        onOpenInquiry: () => {
          openCalled = true;
        },
        onError: (msg) => {
          errorMessage = msg;
        },
        onClearUrl: () => {
          urlCleared = true;
        },
      });

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.status, 'invalid_id');
      assert.strictEqual(fetchCalled, false, 'API must not be queried with malformed ID');
      assert.strictEqual(openCalled, false);
      assert.ok(errorMessage && errorMessage.includes('Invalid inquiry ID'));
      assert.strictEqual(urlCleared, true, 'Malformed param must be cleared from URL');
    });

    it('should handle server or network errors gracefully without crashing', async () => {
      let errorMessage = null;

      const result = await resolveDeepLinkInquiry({
        searchOrUrl: '?inquiry=1',
        isAuthenticated: true,
        fetchInquiryFn: async () => {
          throw new Error('Network connection failed');
        },
        onError: (msg) => {
          errorMessage = msg;
        },
      });

      assert.strictEqual(result.handled, true);
      assert.strictEqual(result.status, 'error');
      assert.strictEqual(errorMessage, 'Network connection failed');
    });
  });
});
