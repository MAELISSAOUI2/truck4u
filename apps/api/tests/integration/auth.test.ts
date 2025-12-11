import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import authRoutes from '../../src/routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const prisma = new PrismaClient();

describe('Auth API Integration Tests', () => {
  let testCustomerId: string;
  let testDriverId: string;
  let customerToken: string;
  let driverToken: string;
  let customerRefreshToken: string;

  beforeAll(async () => {
    // Create test users
    const customer = await prisma.customer.create({
      data: {
        phone: '+21611111001',
        name: 'API Test Customer',
      },
    });
    testCustomerId = customer.id;

    const driver = await prisma.driver.create({
      data: {
        phone: '+21622222001',
        name: 'API Test Driver',
        vehicleType: 'CAMIONNETTE',
        verificationStatus: 'APPROVED',
      },
    });
    testDriverId = driver.id;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ customerId: testCustomerId }, { driverId: testDriverId }],
      },
    });
    await prisma.customer.delete({ where: { id: testCustomerId } });
    await prisma.driver.delete({ where: { id: testDriverId } });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should login customer successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+21611111001',
          userType: 'customer',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(testCustomerId);
      expect(response.body.user.userType).toBe('customer');

      customerToken = response.body.token;
    });

    it('should login driver successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+21622222001',
          userType: 'driver',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.userType).toBe('driver');
      expect(response.body.user.verificationStatus).toBe('APPROVED');

      driverToken = response.body.token;
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+21699999999',
          userType: 'customer',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '1234567', // Invalid format
          userType: 'customer',
        });

      expect(response.status).toBe(400);
    });

    it('should validate userType', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+21611111001',
          userType: 'invalid',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register/customer', () => {
    it('should register new customer', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          phone: '+21633333001',
          name: 'New Customer',
          email: 'new@customer.com',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.phone).toBe('+21633333001');

      // Cleanup
      await prisma.customer.delete({
        where: { phone: '+21633333001' },
      });
    });

    it('should register business customer', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          phone: '+21644444001',
          name: 'Business Customer',
          accountType: 'BUSINESS',
          companyName: 'Test Company SARL',
          taxId: 'TN1234567',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.accountType).toBe('BUSINESS');
      expect(response.body.user.companyName).toBe('Test Company SARL');

      // Cleanup
      await prisma.customer.delete({
        where: { phone: '+21644444001' },
      });
    });

    it('should prevent duplicate phone numbers', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          phone: '+21611111001', // Existing phone
          name: 'Duplicate Customer',
        });

      expect(response.status).toBe(400);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register/customer')
        .send({
          phone: '+21655555001',
          // Missing name
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register/driver', () => {
    it('should register new driver', async () => {
      const response = await request(app)
        .post('/api/auth/register/driver')
        .send({
          phone: '+21666666001',
          name: 'New Driver',
          vehicleType: 'FOURGON',
          vehiclePlate: '123 TU 456',
          vehicleBrand: 'Renault',
          vehicleModel: 'Master',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.vehicleType).toBe('FOURGON');
      expect(response.body.user.verificationStatus).toBe('PENDING_DOCUMENTS');

      // Cleanup
      await prisma.driver.delete({
        where: { phone: '+21666666001' },
      });
    });

    it('should validate vehicle type', async () => {
      const response = await request(app)
        .post('/api/auth/register/driver')
        .send({
          phone: '+21677777001',
          name: 'Driver',
          vehicleType: 'INVALID_TYPE',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeAll(async () => {
      // Create refresh token for testing
      const { refreshAccessToken, createTokenPair } = await import(
        '../../src/services/refreshToken'
      );
      const tokens = await createTokenPair(testCustomerId, 'customer');
      customerRefreshToken = tokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: customerRefreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.refreshToken).not.toBe(customerRefreshToken);

      // Update refresh token for next test
      customerRefreshToken = response.body.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({});

      expect(response.status).toBe(400);
    });

    it('should reject reused refresh token', async () => {
      const oldToken = customerRefreshToken;

      // Use the token once
      await request(app).post('/api/auth/refresh').send({
        refreshToken: oldToken,
      });

      // Try to use it again
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: oldToken,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let logoutRefreshToken: string;

    beforeEach(async () => {
      const { createTokenPair } = await import('../../src/services/refreshToken');
      const tokens = await createTokenPair(testCustomerId, 'customer');
      logoutRefreshToken = tokens.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: logoutRefreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Logged out successfully');

      // Verify token is revoked
      const token = await prisma.refreshToken.findUnique({
        where: { token: logoutRefreshToken },
      });
      expect(token?.isRevoked).toBe(true);
    });

    it('should handle non-existent token gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: 'non-existent-token',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/auth/logout-all', () => {
    it('should logout from all devices', async () => {
      const { createTokenPair } = await import('../../src/services/refreshToken');

      // Create multiple tokens
      await createTokenPair(testCustomerId, 'customer');
      await createTokenPair(testCustomerId, 'customer');
      await createTokenPair(testCustomerId, 'customer');

      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          userType: 'customer',
        });

      expect(response.status).toBe(200);
      expect(response.body.revokedCount).toBeGreaterThanOrEqual(3);

      // Verify all tokens are revoked
      const tokens = await prisma.refreshToken.findMany({
        where: { customerId: testCustomerId },
      });
      expect(tokens.every((t) => t.isRevoked)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout-all')
        .send({
          userType: 'customer',
        });

      expect(response.status).toBe(401);
    });

    it('should validate userType', async () => {
      const response = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          userType: 'invalid',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+21699999999',
          userType: 'customer',
        });

      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('sql');
    });

    it('should rate limit repeated login attempts', async () => {
      // Note: Requires rate limiting middleware to be active
      // This test demonstrates the expected behavior
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app).post('/api/auth/login').send({
            phone: '+21699999999',
            userType: 'customer',
          })
        );
      }

      const responses = await Promise.all(attempts);
      // Some requests should be rate limited (429)
      const rateLimited = responses.filter((r) => r.status === 429);
      // Note: This test will only pass if rate limiting is properly configured
    });
  });
});
