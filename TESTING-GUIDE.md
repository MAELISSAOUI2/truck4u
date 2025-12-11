# 🧪 Truck4u - Complete Testing Guide

**Last Updated:** 2025-12-11

This guide covers the comprehensive test suite for the Truck4u platform, including seed data, unit tests, integration tests, and end-to-end workflows.

---

## 📋 Table of Contents

1. [Test Overview](#test-overview)
2. [Setup & Prerequisites](#setup--prerequisites)
3. [Seed Data](#seed-data)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Test Scenarios](#test-scenarios)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Test Overview

### Test Structure

```
apps/api/tests/
├── services/                  # Unit tests for services
│   ├── refreshToken.test.ts  # Refresh token service tests
│   ├── governorate.test.ts   # Governorate commission tests
│   └── pricing.test.ts       # Pricing algorithm tests (TODO)
├── integration/               # API integration tests
│   ├── auth.test.ts          # Authentication endpoints
│   ├── rides.test.ts         # Ride management (TODO)
│   ├── payments.test.ts      # Payment processing (TODO)
│   └── admin.test.ts         # Admin operations (TODO)
└── e2e/                       # End-to-end workflow tests
    ├── ride-workflow.test.ts # Complete ride lifecycle
    └── subscription.test.ts  # Subscription workflows (TODO)

packages/database/prisma/
└── seed-test-data.ts         # Comprehensive test data seed
```

### Test Types

| Type | Count | Purpose |
|------|-------|---------|
| **Unit Tests** | 30+ | Test individual services in isolation |
| **Integration Tests** | 40+ | Test API endpoints and database interactions |
| **E2E Tests** | 15+ | Test complete user workflows |
| **Total** | **85+** | Comprehensive coverage |

---

## 🛠️ Setup & Prerequisites

### 1. Install Dependencies

```bash
# Install test dependencies
npm install --save-dev @jest/globals jest ts-jest supertest @types/supertest

# Root directory
cd /home/user/truck4u
npm install
```

### 2. Configure Jest

Create `jest.config.js` in `apps/api/`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

### 3. Environment Variables

Create `.env.test` in `apps/api/`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/truck4u_test"
JWT_SECRET="test-secret-key-change-in-production"
REDIS_HOST="localhost"
REDIS_PORT="6379"
NODE_ENV="test"
```

### 4. Test Database Setup

```bash
# Create test database
createdb truck4u_test

# Apply schema
cd packages/database
DATABASE_URL="postgresql://user:password@localhost:5432/truck4u_test" npx prisma db push

# Generate Prisma client
npx prisma generate
```

---

## 🌱 Seed Data

### Overview

The seed file creates **realistic test data** covering all features:

- **2 Admins** (Super Admin, Moderator)
- **5 Customers** (3 Individual, 2 Business)
- **7 Drivers** (various statuses: approved, pending, rejected, deactivated)
- **7 Rides** (all statuses: pending bids, in transit, completed, cancelled)
- **8 Bids** (active, accepted, rejected)
- **4 Payments** (pending, on hold, completed)
- **2 Subscriptions** (Driver Premium, B2B Premium)
- **2 Wallets** with transaction history
- **4 Governorate Commissions** (custom rates)
- **KYC Documents** (approved, pending, rejected)
- **Business Orders** (recurring, on-demand)

### Running Seed

```bash
cd packages/database

# Seed test data
npx ts-node prisma/seed-test-data.ts

# Output:
# ✅ Created 2 admins
# ✅ Created 5 customers
# ✅ Created 7 drivers
# ✅ Created 7 rides
# ... (detailed summary)
```

### Test Users

**Admins:**
- Super Admin: `admin@truck4u.tn`
- Moderator: `moderator@truck4u.tn`

**Customers:**
- Individual: `+21612345001` (Ahmed Ben Ali)
- Individual: `+21612345002` (Fatma Kharrat)
- Individual: `+21612345003` (Mohamed Trabelsi)
- Business: `+21612345010` (Import Export SARL) - B2B subscriber
- Business: `+21612345011` (Restaurant Le Gourmet)

**Drivers:**
- Available (Gold): `+21698765001` (Karim Mansour) - 4.8⭐, 150 rides
- Available (Silver): `+21698765002` (Youssef Gharbi) - 4.5⭐
- Busy (Bronze): `+21698765003` (Mehdi Bouazizi) - On active ride
- Pending Review: `+21698765004` (Riadh Hamdi) - Awaiting KYC
- Rejected: `+21698765005` (Sami Jlassi) - KYC rejected
- With Strikes: `+21698765006` (Nabil Zouari) - 2 strikes
- Deactivated: `+21698765007` (Hichem Dridi) - Account suspended

---

## 🏃 Running Tests

### All Tests

```bash
cd apps/api

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Specific Test Suites

```bash
# Unit tests only
npm test -- tests/services

# Integration tests only
npm test -- tests/integration

# E2E tests only
npm test -- tests/e2e

# Specific file
npm test -- tests/services/refreshToken.test.ts

# With verbose output
npm test -- --verbose

# With coverage
npm test -- --coverage
```

### Test Scripts (add to `package.json`)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/services",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

---

## 📊 Test Coverage

### Unit Tests - Services

**Refresh Token Service** (`refreshToken.test.ts`)
- ✅ Create token pairs for customer, driver, admin
- ✅ Exchange refresh token for new access token
- ✅ Reject invalid/expired/revoked tokens
- ✅ Revoke single token
- ✅ Revoke all user tokens (logout all devices)
- ✅ Cleanup expired tokens

**Governorate Service** (`governorate.test.ts`)
- ✅ Identify governorate from GPS coordinates (all 24 regions)
- ✅ Get custom commission rates
- ✅ Get default commission rate (10%)
- ✅ Ignore inactive commissions
- ✅ Calculate platform fees
- ✅ Handle edge cases (borders, extreme coordinates)

### Integration Tests - API

**Auth Endpoints** (`auth.test.ts`)
- ✅ Login customer/driver/admin
- ✅ Register new customer (individual/business)
- ✅ Register new driver
- ✅ Refresh access token
- ✅ Logout (revoke token)
- ✅ Logout all devices
- ✅ Prevent duplicate phone numbers
- ✅ Validate input data
- ✅ Handle authentication errors
- ✅ Security: No sensitive info in errors

### E2E Tests - Workflows

**Complete Ride Workflow** (`ride-workflow.test.ts`)

**Scenario 1: Successful Ride Completion (16 steps)**
1. ✅ Customer creates ride request
2. ✅ Multiple drivers submit bids
3. ✅ Customer views all bids
4. ✅ Customer accepts lowest bid
5. ✅ Accepted driver marked as unavailable
6. ✅ Driver arrives at pickup
7. ✅ Loading begins
8. ✅ In transit to dropoff
9. ✅ Driver arrives at dropoff
10. ✅ Payment initiated (Cash)
11. ✅ Payment put on hold
12. ✅ Customer confirms payment
13. ✅ Ride marked as completed
14. ✅ Driver earnings recorded
15. ✅ Driver available again
16. ✅ Customer rates driver

**Scenario 2: Customer Cancellation**
- ✅ Cancel within grace period (no fee)

**Scenario 3: Driver Cancellation**
- ✅ Driver cancels after grace period
- ✅ Strike issued to driver
- ✅ Strike count incremented

**Performance Metrics**
- ✅ Complete workflow < 5 seconds

---

## 🎬 Test Scenarios

### 1. Authentication Flow

```bash
# Test all auth endpoints
npm test -- tests/integration/auth.test.ts

# Expected results:
# ✅ 20+ tests pass
# ✅ Login works for all user types
# ✅ Token refresh works correctly
# ✅ Multi-device logout works
# ✅ Input validation catches errors
```

### 2. Governorate Commission System

```bash
# Test governorate detection
npm test -- tests/services/governorate.test.ts

# Test cases:
# ✅ Tunis center → 8% commission
# ✅ Sfax → 9% commission
# ✅ Tataouine → 5% commission (remote area)
# ✅ Unknown regions → 10% default
# ✅ All 24 governorates detected
```

### 3. Refresh Token Security

```bash
# Test token rotation
npm test -- tests/services/refreshToken.test.ts

# Verifies:
# ✅ Tokens expire after 7 days
# ✅ Old tokens revoked on refresh
# ✅ Cannot reuse tokens
# ✅ Revoked tokens rejected
# ✅ Cascade deletion on user delete
```

### 4. Complete Ride Lifecycle

```bash
# Run E2E ride workflow
npm test -- tests/e2e/ride-workflow.test.ts

# Simulates:
# 1. Customer creates ride
# 2. Drivers bid (competition)
# 3. Customer accepts best offer
# 4. Driver completes delivery
# 5. Payment processing
# 6. Rating & feedback
# 7. Driver earnings distribution
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Error**
```
Error: Can't reach database server
```
**Solution:**
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Verify connection string in .env.test
psql -d truck4u_test -U your_user
```

**2. Prisma Client Not Generated**
```
Error: Cannot find module '@prisma/client'
```
**Solution:**
```bash
cd packages/database
npx prisma generate
```

**3. Redis Connection Error**
```
Error: Redis connection refused
```
**Solution:**
```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:alpine
```

**4. Test Timeout**
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```
**Solution:**
```javascript
// Increase timeout for slow tests
it('slow test', async () => {
  // test code
}, 30000); // 30 second timeout
```

**5. Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::4000
```
**Solution:**
```bash
# Find and kill process using port
lsof -ti:4000 | xargs kill -9

# Or use different port for tests
TEST_PORT=4001 npm test
```

### Test Database Cleanup

```bash
# Reset test database
cd packages/database
DATABASE_URL="postgresql://user:password@localhost:5432/truck4u_test" npx prisma migrate reset

# Or drop and recreate
dropdb truck4u_test
createdb truck4u_test
DATABASE_URL="..." npx prisma db push
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with verbose logging
npm test -- tests/e2e/ride-workflow.test.ts --verbose

# Run with coverage and open report
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 📈 Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Services | 90%+ | TBD |
| Routes | 80%+ | TBD |
| Overall | 85%+ | TBD |

### Generate Coverage Report

```bash
# Generate HTML coverage report
npm run test:coverage

# View report
cd coverage/lcov-report
open index.html

# Check coverage thresholds
npm test -- --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":85,"statements":85}}'
```

---

## 🚀 Continuous Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: truck4u_test
        ports:
          - 5432:5432

      redis:
        image: redis:alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install

      - run: cd packages/database && npx prisma generate

      - run: DATABASE_URL="postgresql://postgres:postgres@localhost:5432/truck4u_test" npx prisma db push

      - run: npm run test:ci

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 📝 Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Feature Name', () => {
  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.$disconnect();
  });

  describe('Sub-feature', () => {
    it('should do something', async () => {
      // Arrange
      const input = { ... };

      // Act
      const result = await functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices

1. **Isolation**: Tests should not depend on each other
2. **Cleanup**: Always clean up test data in `afterAll`
3. **Descriptive Names**: Use clear, descriptive test names
4. **AAA Pattern**: Arrange, Act, Assert
5. **Edge Cases**: Test both happy path and error cases
6. **Async/Await**: Use async/await for asynchronous tests
7. **Mock External Services**: Mock APIs, payment gateways, etc.

---

## 🎯 Test Checklist

Before deploying to production:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E workflows complete successfully
- [ ] Code coverage ≥ 85%
- [ ] No pending TODOs in test files
- [ ] Test database seeds correctly
- [ ] Performance tests meet SLA
- [ ] Security tests pass (auth, authorization)
- [ ] Error handling tested
- [ ] Edge cases covered

---

**Next Steps:**
1. Run seed data: `npx ts-node prisma/seed-test-data.ts`
2. Run all tests: `npm test`
3. Review coverage: `npm run test:coverage`
4. Add missing tests (see TODO sections)

**Questions?** Check the main README or create an issue.
