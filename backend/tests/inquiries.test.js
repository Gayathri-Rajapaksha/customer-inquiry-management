const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const { query } = require('../src/config/db');

describe('Inquiry Management API & Security', () => {
  let authCookie;
  let createdInquiryId;

  before(async () => {
    // Authenticate with development staff credentials to obtain session cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: config.seed.email,
        password: config.seed.password,
      });

    assert.strictEqual(loginRes.status, 200);
    const cookies = loginRes.headers['set-cookie'];
    assert.ok(cookies && cookies.length > 0, 'Session cookie must be present after login');
    authCookie = cookies[0].split(';')[0];
  });

  // Security Rule 1: Route Protection without session (All endpoints must reject unauthenticated requests)
  it('GET /api/inquiries should reject unauthenticated requests with 401 and not expose records', async () => {
    const res = await request(app).get('/api/inquiries');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiries, undefined);
  });

  it('GET /api/inquiries/ (trailing slash) should reject unauthenticated requests with 401 and not expose records', async () => {
    const res = await request(app).get('/api/inquiries/');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiries, undefined);
  });

  it('GET /api/inquiries?status=New should reject unauthenticated requests with 401 and not expose records', async () => {
    const res = await request(app).get('/api/inquiries?status=New');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiries, undefined);
  });

  it('GET /api/inquiries?search=test should reject unauthenticated requests with 401 and not expose records', async () => {
    const res = await request(app).get('/api/inquiries?search=test');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiries, undefined);
  });

  it('GET /api/inquiries/stats should reject unauthenticated requests with 401 and not expose stats', async () => {
    const res = await request(app).get('/api/inquiries/stats');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.stats, undefined);
  });

  it('GET /api/inquiries/:id should reject unauthenticated requests with 401 and not expose detail', async () => {
    const res = await request(app).get('/api/inquiries/1');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiry, undefined);
  });

  it('POST /api/inquiries should reject unauthenticated requests with 401 and not create record', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .send({
        customer_name: 'Unauthenticated Hacker',
        contact_info: 'hacker@example.com',
        subject: 'Unauthorized Subject',
        description: 'Unauthorized Description',
      });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiry, undefined);
  });

  it('PATCH /api/inquiries/:id/status should reject unauthenticated requests with 401 and not modify status', async () => {
    const res = await request(app)
      .patch('/api/inquiries/1/status')
      .send({ status: 'Resolved' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiry, undefined);
  });

  it('PUT /api/inquiries/:id should reject unauthenticated requests with 401 and not modify record', async () => {
    const res = await request(app)
      .put('/api/inquiries/1')
      .send({
        customer_name: 'Hacker Name',
        contact_info: 'hacker@example.com',
        subject: 'Hacked Subject',
        description: 'Hacked Description longer than 5 chars',
        status: 'Resolved',
      });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiry, undefined);
  });

  // Security Rule 2: Rejection of forged or invalid session cookies across all endpoints
  const forgedCookie = 'customer_inquiry_sid=s%3Aforged_sid.invalid_signature_hash_12345';

  it('GET /api/inquiries should reject forged session cookies with 401', async () => {
    const res = await request(app)
      .get('/api/inquiries')
      .set('Cookie', forgedCookie);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiries, undefined);
  });

  it('GET /api/inquiries/stats should reject forged session cookies with 401', async () => {
    const res = await request(app)
      .get('/api/inquiries/stats')
      .set('Cookie', forgedCookie);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.stats, undefined);
  });

  it('GET /api/inquiries/:id should reject forged session cookies with 401', async () => {
    const res = await request(app)
      .get('/api/inquiries/1')
      .set('Cookie', forgedCookie);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiry, undefined);
  });

  it('POST /api/inquiries should reject forged session cookies with 401', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', forgedCookie)
      .send({
        customer_name: 'Forged Hacker',
        contact_info: 'forged@example.com',
        subject: 'Forged Subject',
        description: 'Forged Description',
      });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiry, undefined);
  });

  it('PATCH /api/inquiries/:id/status should reject forged session cookies with 401', async () => {
    const res = await request(app)
      .patch('/api/inquiries/1/status')
      .set('Cookie', forgedCookie)
      .send({ status: 'Resolved' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiry, undefined);
  });

  it('PUT /api/inquiries/:id should reject forged session cookies with 401', async () => {
    const res = await request(app)
      .put('/api/inquiries/1')
      .set('Cookie', forgedCookie)
      .send({
        customer_name: 'Forged Hacker',
        contact_info: 'forged@example.com',
        subject: 'Forged Subject',
        description: 'Forged Description longer than 5 chars',
        status: 'Resolved',
      });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiry, undefined);
  });

  it('GET /api/inquiries should reject unrelated cookies with 401', async () => {
    const res = await request(app)
      .get('/api/inquiries')
      .set('Cookie', 'other_cookie=xyz; theme=dark');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Unauthorized: Authentication required');
    assert.strictEqual(res.body.inquiries, undefined);
  });

  // Validation Rules & Database Integrity Tests for POST /api/inquiries
  it('POST /api/inquiries should reject missing customer_name with 400 and not create a database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        contact_info: 'test@example.com',
        subject: 'Inquiry Without Customer Name',
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Customer name is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject whitespace-only customer_name with 400 and not create a database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: '    ',
        contact_info: 'test@example.com',
        subject: 'Inquiry With Whitespace Customer Name',
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Customer name is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject missing contact_info with 400 and not create a database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        subject: 'Inquiry Without Contact Info',
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Contact information is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject whitespace-only contact_info with 400 and not create a database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: '   ',
        subject: 'Inquiry With Whitespace Contact Info',
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Contact information is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject missing subject with 400 and not create a database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'jane.doe@example.com',
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Subject is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject whitespace-only subject with 400 and not create a database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'jane.doe@example.com',
        subject: '    ',
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Subject is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject missing description with 400 and not create a database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'jane.doe@example.com',
        subject: 'Valid Subject',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Description is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject whitespace-only description with 400 and not create a database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'jane.doe@example.com',
        subject: 'Valid Subject',
        description: '     ',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Description is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject malformed input: description shorter than 5 chars with 400 and not create DB record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'jane.doe@example.com',
        subject: 'Valid Subject',
        description: 'Hey!',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Description must be at least 5 characters long');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on validation failure');
  });

  it('POST /api/inquiries should reject malformed input: non-string field types with 400 and not create DB record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    // Number instead of string for customer_name
    const res1 = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 12345,
        contact_info: 'test@example.com',
        subject: 'Valid Subject',
        description: 'Detailed description exceeding 5 characters.',
      });
    assert.strictEqual(res1.status, 400);
    assert.strictEqual(res1.body.message, 'Customer name is required');

    // Object instead of string for contact_info
    const res2 = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: { email: 'test@example.com' },
        subject: 'Valid Subject',
        description: 'Detailed description exceeding 5 characters.',
      });
    assert.strictEqual(res2.status, 400);
    assert.strictEqual(res2.body.message, 'Contact information is required');

    // Array instead of string for subject
    const res3 = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'test@example.com',
        subject: ['Array', 'Subject'],
        description: 'Detailed description exceeding 5 characters.',
      });
    assert.strictEqual(res3.status, 400);
    assert.strictEqual(res3.body.message, 'Subject is required');

    // Boolean instead of string for description
    const res4 = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'test@example.com',
        subject: 'Valid Subject',
        description: true,
      });
    assert.strictEqual(res4.status, 400);
    assert.strictEqual(res4.body.message, 'Description is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore, 'Database count must not increase on malformed input');
  });

  it('POST /api/inquiries should reject malformed input: customer_name exceeding 150 chars with 400 and not create DB record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'A'.repeat(151),
        contact_info: 'test@example.com',
        subject: 'Valid Subject',
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Customer name cannot exceed 150 characters');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore);
  });

  it('POST /api/inquiries should reject malformed input: contact_info exceeding 255 chars with 400 and not create DB record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'B'.repeat(256),
        subject: 'Valid Subject',
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Contact information cannot exceed 255 characters');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore);
  });

  it('POST /api/inquiries should reject malformed input: subject exceeding 200 chars with 400 and not create DB record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'test@example.com',
        subject: 'C'.repeat(201),
        description: 'Detailed description exceeding 5 characters.',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Subject cannot exceed 200 characters');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore);
  });

  it('POST /api/inquiries should reject malformed input: invalid status enum with 400 and not create DB record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'Jane Doe',
        contact_info: 'test@example.com',
        subject: 'Valid Subject',
        description: 'Detailed description exceeding 5 characters.',
        status: 'UnknownStatus',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.ok(res.body.message.includes('Invalid status'));

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore);
  });

  it('POST /api/inquiries should reject malformed input: empty request body with 400 and not create DB record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({});

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.strictEqual(res.body.message, 'Customer name is required');

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore);
  });

  // Creation Rule with database record verification
  it('POST /api/inquiries should create a new inquiry with valid data, return 201, and verify database record', async () => {
    const countBefore = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;

    const res = await request(app)
      .post('/api/inquiries')
      .set('Cookie', authCookie)
      .send({
        customer_name: 'David Miller',
        contact_info: 'david.miller@example.com',
        subject: 'Artisan Roast Delivery Schedule',
        description: 'Requesting bi-weekly scheduled delivery of 25kg Single Origin Ethiopian Yirgacheffe.',
        status: 'New',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.inquiry);
    assert.strictEqual(res.body.inquiry.customer_name, 'David Miller');
    assert.strictEqual(res.body.inquiry.contact_info, 'david.miller@example.com');
    assert.strictEqual(res.body.inquiry.subject, 'Artisan Roast Delivery Schedule');
    assert.strictEqual(res.body.inquiry.status, 'New');
    assert.ok(res.body.inquiry.creator_email);
    createdInquiryId = res.body.inquiry.id;
    assert.ok(createdInquiryId > 0);

    const countAfter = (await query('SELECT COUNT(*)::int AS count FROM inquiries')).rows[0].count;
    assert.strictEqual(countAfter, countBefore + 1, 'Database count must increase by exactly 1 on valid inquiry creation');

    // Verify record in PostgreSQL directly
    const dbRecord = await query('SELECT * FROM inquiries WHERE id = $1', [createdInquiryId]);
    assert.strictEqual(dbRecord.rows.length, 1);
    assert.strictEqual(dbRecord.rows[0].customer_name, 'David Miller');
    assert.strictEqual(dbRecord.rows[0].status, 'New');
  });

  // Retrieval Rules
  it('GET /api/inquiries should return the list of inquiries for authenticated staff', async () => {
    const res = await request(app)
      .get('/api/inquiries')
      .set('Cookie', authCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(Array.isArray(res.body.inquiries));
    assert.ok(res.body.inquiries.length >= 1);
  });

  it('GET /api/inquiries should filter by status correctly', async () => {
    const res = await request(app)
      .get('/api/inquiries?status=New')
      .set('Cookie', authCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    res.body.inquiries.forEach((item) => {
      assert.strictEqual(item.status, 'New');
    });
  });

  it('GET /api/inquiries should reject invalid status filter with 400', async () => {
    const res = await request(app)
      .get('/api/inquiries?status=NonExistentStatus')
      .set('Cookie', authCookie);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
  });

  it('GET /api/inquiries should filter by search term across fields', async () => {
    const res = await request(app)
      .get('/api/inquiries?search=David')
      .set('Cookie', authCookie);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.inquiries.some((item) => item.customer_name.includes('David')));
  });

  // Stats Rule
  it('GET /api/inquiries/stats should return aggregate counts for all statuses', async () => {
    const res = await request(app)
      .get('/api/inquiries/stats')
      .set('Cookie', authCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(typeof res.body.stats.total === 'number');
    assert.ok(typeof res.body.stats.new === 'number');
    assert.ok(typeof res.body.stats.inProgress === 'number');
    assert.ok(typeof res.body.stats.resolved === 'number');
    assert.strictEqual(
      res.body.stats.total,
      res.body.stats.new + res.body.stats.inProgress + res.body.stats.resolved
    );
  });

  // Single Inquiry Details Rules
  it('GET /api/inquiries/:id should return details for an existing inquiry', async () => {
    const res = await request(app)
      .get(`/api/inquiries/${createdInquiryId}`)
      .set('Cookie', authCookie);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.inquiry.id, createdInquiryId);
    assert.strictEqual(res.body.inquiry.customer_name, 'David Miller');
  });

  it('GET /api/inquiries/:id should return 404 for nonexistent inquiry ID', async () => {
    const res = await request(app)
      .get('/api/inquiries/999999')
      .set('Cookie', authCookie);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.status, 'error');
  });

  it('GET /api/inquiries/:id should return 400 for invalid ID format', async () => {
    const res = await request(app)
      .get('/api/inquiries/not-a-number')
      .set('Cookie', authCookie);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
  });

  // Status Update Rules
  it('PATCH /api/inquiries/:id/status should update inquiry status to In Progress', async () => {
    const res = await request(app)
      .patch(`/api/inquiries/${createdInquiryId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'In Progress' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.inquiry.status, 'In Progress');
  });

  it('PATCH /api/inquiries/:id/status should update inquiry status to Resolved', async () => {
    const res = await request(app)
      .patch(`/api/inquiries/${createdInquiryId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'Resolved' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.inquiry.status, 'Resolved');
  });

  it('PATCH /api/inquiries/:id/status should reject invalid status values with 400', async () => {
    const res = await request(app)
      .patch(`/api/inquiries/${createdInquiryId}/status`)
      .set('Cookie', authCookie)
      .send({ status: 'PendingReview' });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 'error');
  });

  it('PATCH /api/inquiries/:id/status should return 404 for nonexistent inquiry', async () => {
    const res = await request(app)
      .patch('/api/inquiries/999999/status')
      .set('Cookie', authCookie)
      .send({ status: 'Resolved' });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.status, 'error');
  });

  // Full Update Rules
  it('PUT /api/inquiries/:id should update all inquiry fields for authenticated staff', async () => {
    const res = await request(app)
      .put(`/api/inquiries/${createdInquiryId}`)
      .set('Cookie', authCookie)
      .send({
        customer_name: 'David Miller Updated',
        contact_info: 'david.updated@example.com',
        subject: 'Updated Artisan Roast Schedule',
        description: 'Updated delivery volume to 30kg per shipment.',
        status: 'In Progress',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.inquiry.customer_name, 'David Miller Updated');
    assert.strictEqual(res.body.inquiry.contact_info, 'david.updated@example.com');
    assert.strictEqual(res.body.inquiry.subject, 'Updated Artisan Roast Schedule');
    assert.strictEqual(res.body.inquiry.status, 'In Progress');
  });
});
