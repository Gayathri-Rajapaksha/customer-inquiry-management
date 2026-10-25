import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateLoginForm,
  validateInquiryForm,
  filterInquiries,
} from '../src/utils/validation.js';

describe('Frontend Form Validation & User Interaction Rules', () => {
  describe('Staff Login Validation (validateLoginForm)', () => {
    it('should reject empty credentials', () => {
      const result = validateLoginForm({ email: '', password: '' });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.email, 'Staff email is required');
      assert.strictEqual(result.errors.password, 'Password is required');
    });

    it('should reject invalid email formats', () => {
      const result = validateLoginForm({ email: 'not-an-email', password: 'SecretPassword123!' });
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.email, 'Please enter a valid email address');
      assert.strictEqual(result.errors.password, undefined);
    });

    it('should accept valid staff email and password', () => {
      const result = validateLoginForm({
        email: 'admin@coffeeninja.com',
        password: 'ValidPassword2026!',
      });
      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, {});
    });
  });

  describe('Customer Inquiry Form Validation (validateInquiryForm)', () => {
    it('should reject missing required fields with descriptive error messages', () => {
      const result = validateInquiryForm({
        customer_name: '',
        contact_info: '',
        subject: '',
        description: '',
      });

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.customer_name, 'Customer name is required');
      assert.strictEqual(result.errors.contact_info, 'Contact information (email or phone) is required');
      assert.strictEqual(result.errors.subject, 'Subject is required');
      assert.strictEqual(result.errors.description, 'Description is required');
    });

    it('should reject customer name exceeding 150 characters', () => {
      const longName = 'A'.repeat(151);
      const result = validateInquiryForm({
        customer_name: longName,
        contact_info: 'customer@example.com',
        subject: 'Valid Subject',
        description: 'Valid description longer than 5 chars',
      });

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.customer_name, 'Customer name cannot exceed 150 characters');
    });

    it('should reject descriptions shorter than 5 characters', () => {
      const result = validateInquiryForm({
        customer_name: 'Marcus Chen',
        contact_info: 'marcus@cafe.com',
        subject: 'Espresso Machine Question',
        description: 'Help', // Only 4 characters
      });

      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.description, 'Description must be at least 5 characters long');
    });

    it('should reject invalid status value', () => {
      const result = validateInquiryForm({
        customer_name: 'Marcus Chen',
        contact_info: 'marcus@cafe.com',
        subject: 'Espresso Machine Question',
        description: 'Detailed description about espresso equipment.',
        status: 'Archived', // Not in ['New', 'In Progress', 'Resolved']
      });

      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.status.includes('Invalid status'));
    });

    it('should accept a fully valid inquiry submission', () => {
      const result = validateInquiryForm({
        customer_name: 'Elena Rostova',
        contact_info: 'elena@brewandbake.org',
        subject: 'Cold Brew Keg Delivery Frequency',
        description: 'Inquiring about scheduling bi-weekly delivery of nitro cold brew kegs.',
        status: 'New',
      });

      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, {});
    });
  });

  describe('Dashboard Filtering & Search Interaction (filterInquiries)', () => {
    const sampleInquiries = [
      {
        id: 1,
        customer_name: 'Sarah Jenkins',
        contact_info: 'sarah.jenkins@peakroasters.com',
        subject: 'Wholesale Espresso Beans Inquiry',
        description: 'Bulk pricing for 50kg monthly orders.',
        status: 'New',
      },
      {
        id: 2,
        customer_name: 'Marcus Chen',
        contact_info: '+1 (555) 234-5678',
        subject: 'Commercial Machine Repair',
        description: 'Steam wand pressure issue on dual boiler unit.',
        status: 'In Progress',
      },
      {
        id: 3,
        customer_name: 'Elena Rostova',
        contact_info: 'elena@brewandbake.org',
        subject: 'Cold Brew Keg Delivery',
        description: 'Confirmation on nitro keg schedule.',
        status: 'Resolved',
      },
    ];

    it('should filter inquiries by status correctly', () => {
      const newOnly = filterInquiries(sampleInquiries, { status: 'New', search: '' });
      assert.strictEqual(newOnly.length, 1);
      assert.strictEqual(newOnly[0].id, 1);

      const inProgressOnly = filterInquiries(sampleInquiries, { status: 'In Progress', search: '' });
      assert.strictEqual(inProgressOnly.length, 1);
      assert.strictEqual(inProgressOnly[0].id, 2);

      const resolvedOnly = filterInquiries(sampleInquiries, { status: 'Resolved', search: '' });
      assert.strictEqual(resolvedOnly.length, 1);
      assert.strictEqual(resolvedOnly[0].id, 3);
    });

    it('should search inquiries case-insensitively across fields', () => {
      // Search by customer name
      const byName = filterInquiries(sampleInquiries, { status: 'All', search: 'marcus' });
      assert.strictEqual(byName.length, 1);
      assert.strictEqual(byName[0].customer_name, 'Marcus Chen');

      // Search by contact info
      const byContact = filterInquiries(sampleInquiries, { status: 'All', search: '555' });
      assert.strictEqual(byContact.length, 1);
      assert.strictEqual(byContact[0].id, 2);

      // Search by subject
      const bySubject = filterInquiries(sampleInquiries, { status: 'All', search: 'wholesale' });
      assert.strictEqual(bySubject.length, 1);
      assert.strictEqual(bySubject[0].id, 1);

      // Search by description content
      const byDesc = filterInquiries(sampleInquiries, { status: 'All', search: 'nitro' });
      assert.strictEqual(byDesc.length, 1);
      assert.strictEqual(byDesc[0].id, 3);
    });

    it('should return empty list when no inquiries match search', () => {
      const noMatch = filterInquiries(sampleInquiries, { status: 'All', search: 'nonexistent keyword' });
      assert.strictEqual(noMatch.length, 0);
    });

    it('should return all inquiries when status is All and search is empty', () => {
      const all = filterInquiries(sampleInquiries, { status: 'All', search: '' });
      assert.strictEqual(all.length, 3);
    });
  });
});
