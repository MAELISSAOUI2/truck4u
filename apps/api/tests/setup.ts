/**
 * Jest Test Setup
 *
 * This file runs before all tests and sets up the test environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: jest.fn(),
  warn: jest.fn(),
  // Suppress log and info in tests
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Global test utilities
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const randomPhone = () => {
  const random = Math.floor(Math.random() * 90000000) + 10000000;
  return `+216${random}`;
};

export const randomEmail = () => {
  const random = Math.random().toString(36).substring(7);
  return `test-${random}@truck4u.tn`;
};
