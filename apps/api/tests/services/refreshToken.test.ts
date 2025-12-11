import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import {
  createTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
} from '../../src/services/refreshToken';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

describe('Refresh Token Service', () => {
  let testCustomerId: string;
  let testDriverId: string;
  let testAdminId: string;

  beforeAll(async () => {
    // Create test users
    const customer = await prisma.customer.create({
      data: {
        phone: '+21699999001',
        name: 'Test Customer',
      },
    });
    testCustomerId = customer.id;

    const driver = await prisma.driver.create({
      data: {
        phone: '+21699999002',
        name: 'Test Driver',
        vehicleType: 'CAMIONNETTE',
        verificationStatus: 'APPROVED',
      },
    });
    testDriverId = driver.id;

    const admin = await prisma.admin.create({
      data: {
        email: 'test@admin.com',
        name: 'Test Admin',
      },
    });
    testAdminId = admin.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { customerId: testCustomerId },
          { driverId: testDriverId },
          { adminId: testAdminId },
        ],
      },
    });
    await prisma.customer.delete({ where: { id: testCustomerId } });
    await prisma.driver.delete({ where: { id: testDriverId } });
    await prisma.admin.delete({ where: { id: testAdminId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean refresh tokens before each test
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { customerId: testCustomerId },
          { driverId: testDriverId },
          { adminId: testAdminId },
        ],
      },
    });
  });

  describe('createTokenPair', () => {
    it('should create access and refresh tokens for customer', async () => {
      const tokens = await createTokenPair(testCustomerId, 'customer');

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');

      // Verify access token
      const decoded = jwt.verify(tokens.accessToken, JWT_SECRET) as any;
      expect(decoded.id).toBe(testCustomerId);
      expect(decoded.role).toBe('customer');

      // Verify refresh token in database
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: tokens.refreshToken },
      });
      expect(refreshToken).not.toBeNull();
      expect(refreshToken?.customerId).toBe(testCustomerId);
      expect(refreshToken?.isRevoked).toBe(false);
    });

    it('should create tokens for driver', async () => {
      const tokens = await createTokenPair(testDriverId, 'driver');

      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: tokens.refreshToken },
      });
      expect(refreshToken?.driverId).toBe(testDriverId);
    });

    it('should create tokens for admin', async () => {
      const tokens = await createTokenPair(testAdminId, 'admin');

      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: tokens.refreshToken },
      });
      expect(refreshToken?.adminId).toBe(testAdminId);
    });
  });

  describe('refreshAccessToken', () => {
    it('should exchange valid refresh token for new token pair', async () => {
      const initialTokens = await createTokenPair(testCustomerId, 'customer');

      // Refresh the token
      const newTokens = await refreshAccessToken(initialTokens.refreshToken);

      expect(newTokens).not.toBeNull();
      expect(newTokens?.accessToken).not.toBe(initialTokens.accessToken);
      expect(newTokens?.refreshToken).not.toBe(initialTokens.refreshToken);

      // Old token should be revoked
      const oldToken = await prisma.refreshToken.findUnique({
        where: { token: initialTokens.refreshToken },
      });
      expect(oldToken?.isRevoked).toBe(true);

      // New token should exist and be valid
      const newToken = await prisma.refreshToken.findUnique({
        where: { token: newTokens!.refreshToken },
      });
      expect(newToken).not.toBeNull();
      expect(newToken?.isRevoked).toBe(false);
    });

    it('should return null for invalid refresh token', async () => {
      const result = await refreshAccessToken('invalid-token-string');
      expect(result).toBeNull();
    });

    it('should return null for revoked refresh token', async () => {
      const tokens = await createTokenPair(testCustomerId, 'customer');

      // Revoke the token
      await prisma.refreshToken.update({
        where: { token: tokens.refreshToken },
        data: { isRevoked: true },
      });

      const result = await refreshAccessToken(tokens.refreshToken);
      expect(result).toBeNull();
    });

    it('should return null for expired refresh token', async () => {
      const tokens = await createTokenPair(testCustomerId, 'customer');

      // Manually expire the token
      await prisma.refreshToken.update({
        where: { token: tokens.refreshToken },
        data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
      });

      const result = await refreshAccessToken(tokens.refreshToken);
      expect(result).toBeNull();

      // Expired token should be deleted
      const deletedToken = await prisma.refreshToken.findUnique({
        where: { token: tokens.refreshToken },
      });
      expect(deletedToken).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a valid refresh token', async () => {
      const tokens = await createTokenPair(testCustomerId, 'customer');

      const result = await revokeRefreshToken(tokens.refreshToken);
      expect(result).toBe(true);

      const revokedToken = await prisma.refreshToken.findUnique({
        where: { token: tokens.refreshToken },
      });
      expect(revokedToken?.isRevoked).toBe(true);
    });

    it('should return false for non-existent token', async () => {
      const result = await revokeRefreshToken('non-existent-token');
      expect(result).toBe(false);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a customer', async () => {
      // Create multiple tokens
      await createTokenPair(testCustomerId, 'customer');
      await createTokenPair(testCustomerId, 'customer');
      await createTokenPair(testCustomerId, 'customer');

      const count = await revokeAllUserTokens(testCustomerId, 'customer');
      expect(count).toBe(3);

      // Verify all tokens are revoked
      const tokens = await prisma.refreshToken.findMany({
        where: { customerId: testCustomerId },
      });
      expect(tokens.every((t) => t.isRevoked)).toBe(true);
    });

    it('should only revoke tokens for specified user', async () => {
      await createTokenPair(testCustomerId, 'customer');
      await createTokenPair(testDriverId, 'driver');

      const count = await revokeAllUserTokens(testCustomerId, 'customer');
      expect(count).toBe(1);

      // Driver token should still be active
      const driverTokens = await prisma.refreshToken.findMany({
        where: { driverId: testDriverId },
      });
      expect(driverTokens.every((t) => !t.isRevoked)).toBe(true);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      // Create tokens
      const tokens1 = await createTokenPair(testCustomerId, 'customer');
      const tokens2 = await createTokenPair(testDriverId, 'driver');

      // Manually expire first token
      await prisma.refreshToken.update({
        where: { token: tokens1.refreshToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const count = await cleanupExpiredTokens();
      expect(count).toBe(1);

      // Expired token should be deleted
      const expiredToken = await prisma.refreshToken.findUnique({
        where: { token: tokens1.refreshToken },
      });
      expect(expiredToken).toBeNull();

      // Valid token should still exist
      const validToken = await prisma.refreshToken.findUnique({
        where: { token: tokens2.refreshToken },
      });
      expect(validToken).not.toBeNull();
    });
  });
});
