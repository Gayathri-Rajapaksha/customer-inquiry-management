const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

describe('Authentication & Security Rules', () => {
  // Test 1: Route Protection Middleware (Security Rule)
  it('GET /api/auth/me should reject unauthenticated requests with 401 Unauthorized', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .expect(401);

    assert.strictEqual(response.body.status, 'error');
    assert.strictEqual(response.body.message, 'Unauthorized: Authentication required');
  });

  // Test 2: Input Validation Rule
  it('POST /api/auth/login should reject requests missing email or password with 400 Bad Request', async () => {
    // Missing password
    const resNoPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@coffeeninja.com' })
      .expect(400);

    assert.strictEqual(resNoPassword.body.status, 'error');
    assert.strictEqual(resNoPassword.body.message, 'Email and password are required');

    // Missing email
    const resNoEmail = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password123!' })
      .expect(400);

    assert.strictEqual(resNoEmail.body.status, 'error');
    assert.strictEqual(resNoEmail.body.message, 'Email and password are required');
  });

  // Test 3: Logout Endpoint Behavior
  it('POST /api/auth/logout should return 200 OK and clear session', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect(200);

    assert.strictEqual(response.body.status, 'ok');
    assert.strictEqual(response.body.message, 'Logged out successfully');
  });
});
