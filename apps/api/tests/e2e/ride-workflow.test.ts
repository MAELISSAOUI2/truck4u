import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import authRoutes from '../../src/routes/auth';
import rideRoutes from '../../src/routes/rides';
import paymentRoutes from '../../src/routes/payments';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payments', paymentRoutes);

const prisma = new PrismaClient();

/**
 * End-to-End Workflow Tests
 *
 * These tests simulate complete user journeys through the application,
 * covering all major workflows from ride creation to completion.
 */
describe('E2E: Complete Ride Workflow', () => {
  let customerId: string;
  let customerToken: string;
  let driverId1: string;
  let driverToken1: string;
  let driverId2: string;
  let driverToken2: string;
  let rideId: string;
  let acceptedBidId: string;

  beforeAll(async () => {
    // Setup test users
    const customer = await prisma.customer.create({
      data: {
        phone: '+21610000001',
        name: 'E2E Test Customer',
      },
    });
    customerId = customer.id;

    const driver1 = await prisma.driver.create({
      data: {
        phone: '+21610000002',
        name: 'E2E Test Driver 1',
        vehicleType: 'CAMIONNETTE',
        vehiclePlate: 'E2E 001',
        verificationStatus: 'APPROVED',
        isAvailable: true,
        currentLat: 36.8065,
        currentLng: 10.1815,
      },
    });
    driverId1 = driver1.id;

    const driver2 = await prisma.driver.create({
      data: {
        phone: '+21610000003',
        name: 'E2E Test Driver 2',
        vehicleType: 'CAMIONNETTE',
        vehiclePlate: 'E2E 002',
        verificationStatus: 'APPROVED',
        isAvailable: true,
        currentLat: 36.8065,
        currentLng: 10.1815,
      },
    });
    driverId2 = driver2.id;

    // Login users
    const customerLogin = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+21610000001', userType: 'customer' });
    customerToken = customerLogin.body.token;

    const driver1Login = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+21610000002', userType: 'driver' });
    driverToken1 = driver1Login.body.token;

    const driver2Login = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+21610000003', userType: 'driver' });
    driverToken2 = driver2Login.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.payment.deleteMany({
      where: { customerId },
    });
    await prisma.driverEarnings.deleteMany({
      where: { driverId: { in: [driverId1, driverId2] } },
    });
    await prisma.bid.deleteMany({
      where: { driverId: { in: [driverId1, driverId2] } },
    });
    await prisma.ride.deleteMany({
      where: { customerId },
    });
    await prisma.customer.delete({ where: { id: customerId } });
    await prisma.driver.delete({ where: { id: driverId1 } });
    await prisma.driver.delete({ where: { id: driverId2 } });
    await prisma.$disconnect();
  });

  describe('Scenario 1: Successful Ride Completion', () => {
    it('Step 1: Customer creates a ride request', async () => {
      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'CAMIONNETTE',
          loadDescription: 'E2E Test: Cartons de vêtements',
          loadWeight: 100,
          loadAssistance: false,
          pickupLat: 36.8065,
          pickupLng: 10.1815,
          pickupAddress: 'Tunis Centre',
          dropoffLat: 36.8625,
          dropoffLng: 10.1956,
          dropoffAddress: 'Ariana',
          scheduledPickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.ride).toHaveProperty('id');
      expect(response.body.ride.status).toBe('PENDING_BIDS');
      expect(response.body.ride).toHaveProperty('estimatedPrice');

      rideId = response.body.ride.id;

      console.log(`✅ Ride created: ${rideId}`);
      console.log(`   Estimated Price: ${response.body.ride.estimatedPrice} DT`);
    });

    it('Step 2: Multiple drivers submit bids', async () => {
      // Driver 1 bids
      const bid1Response = await request(app)
        .post(`/api/rides/${rideId}/bid`)
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({
          proposedPrice: 25.0,
          estimatedArrival: 15,
          message: 'Service rapide et professionnel',
        });

      expect(bid1Response.status).toBe(201);
      expect(bid1Response.body.success).toBe(true);

      console.log(`✅ Driver 1 bid: 25.00 DT (15 min ETA)`);

      // Driver 2 bids
      const bid2Response = await request(app)
        .post(`/api/rides/${rideId}/bid`)
        .set('Authorization', `Bearer ${driverToken2}`)
        .send({
          proposedPrice: 23.0,
          estimatedArrival: 20,
          message: 'Meilleur prix',
        });

      expect(bid2Response.status).toBe(201);

      console.log(`✅ Driver 2 bid: 23.00 DT (20 min ETA)`);
    });

    it('Step 3: Customer views all bids', async () => {
      const response = await request(app)
        .get(`/api/rides/${rideId}/bids`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.bids).toHaveLength(2);
      expect(response.body.bids[0]).toHaveProperty('driver');
      expect(response.body.bids[0]).toHaveProperty('proposedPrice');

      console.log(`✅ Customer viewing ${response.body.bids.length} bids`);
    });

    it('Step 4: Customer accepts Driver 2 bid (lower price)', async () => {
      // Get Driver 2's bid ID
      const bidsResponse = await request(app)
        .get(`/api/rides/${rideId}/bids`)
        .set('Authorization', `Bearer ${customerToken}`);

      const driver2Bid = bidsResponse.body.bids.find(
        (b: any) => b.driverId === driverId2
      );
      acceptedBidId = driver2Bid.id;

      const response = await request(app)
        .post(`/api/rides/${rideId}/accept-bid`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          bidId: acceptedBidId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ride.status).toBe('DRIVER_ARRIVING');
      expect(response.body.ride.driverId).toBe(driverId2);

      console.log(`✅ Bid accepted - Driver 2 assigned to ride`);
    });

    it('Step 5: Driver 2 is marked as unavailable', async () => {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId2 },
      });

      expect(driver?.isAvailable).toBe(false);

      console.log(`✅ Driver 2 marked as busy`);
    });

    it('Step 6: Driver 2 arrives at pickup', async () => {
      const response = await request(app)
        .put(`/api/rides/${rideId}/status`)
        .set('Authorization', `Bearer ${driverToken2}`)
        .send({
          status: 'PICKUP_ARRIVED',
        });

      expect(response.status).toBe(200);
      expect(response.body.ride.status).toBe('PICKUP_ARRIVED');

      console.log(`✅ Driver arrived at pickup location`);
    });

    it('Step 7: Loading begins', async () => {
      const response = await request(app)
        .put(`/api/rides/${rideId}/status`)
        .set('Authorization', `Bearer ${driverToken2}`)
        .send({
          status: 'LOADING',
        });

      expect(response.status).toBe(200);
      expect(response.body.ride.status).toBe('LOADING');

      console.log(`✅ Loading goods...`);
    });

    it('Step 8: In transit to dropoff', async () => {
      const response = await request(app)
        .put(`/api/rides/${rideId}/status`)
        .set('Authorization', `Bearer ${driverToken2}`)
        .send({
          status: 'IN_TRANSIT',
        });

      expect(response.status).toBe(200);
      expect(response.body.ride.status).toBe('IN_TRANSIT');

      console.log(`✅ En route to destination`);
    });

    it('Step 9: Driver arrives at dropoff', async () => {
      const response = await request(app)
        .put(`/api/rides/${rideId}/status`)
        .set('Authorization', `Bearer ${driverToken2}`)
        .send({
          status: 'DROPOFF_ARRIVED',
        });

      expect(response.status).toBe(200);
      expect(response.body.ride.status).toBe('DROPOFF_ARRIVED');

      console.log(`✅ Arrived at destination`);
    });

    it('Step 10: Payment initiated (Cash)', async () => {
      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rideId: rideId,
          method: 'CASH',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.payment.status).toBe('PENDING');

      console.log(`✅ Payment initiated - Cash`);
    });

    it('Step 11: Payment put on hold (driver arrived)', async () => {
      const payment = await prisma.payment.findFirst({
        where: { rideId },
      });

      const response = await request(app)
        .post(`/api/payments/${payment!.id}/hold`)
        .set('Authorization', `Bearer ${driverToken2}`);

      expect(response.status).toBe(200);
      expect(response.body.payment.status).toBe('ON_HOLD');

      console.log(`✅ Payment on hold`);
    });

    it('Step 12: Customer confirms cash payment', async () => {
      const payment = await prisma.payment.findFirst({
        where: { rideId },
      });

      const response = await request(app)
        .post(`/api/payments/${payment!.id}/confirm-cash`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.payment.status).toBe('COMPLETED');

      console.log(`✅ Payment confirmed`);
    });

    it('Step 13: Ride marked as completed', async () => {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      expect(ride?.status).toBe('COMPLETED');
      expect(ride?.completedAt).toBeTruthy();

      console.log(`✅ Ride completed`);
    });

    it('Step 14: Driver earnings recorded', async () => {
      const earnings = await prisma.driverEarnings.findFirst({
        where: { rideId },
      });

      expect(earnings).toBeTruthy();
      expect(earnings?.driverId).toBe(driverId2);
      expect(earnings?.netEarnings).toBeGreaterThan(0);

      console.log(`✅ Driver earnings: ${earnings?.netEarnings} DT`);
    });

    it('Step 15: Driver 2 is available again', async () => {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId2 },
      });

      expect(driver?.isAvailable).toBe(true);
      expect(driver?.totalEarnings).toBeGreaterThan(0);

      console.log(`✅ Driver marked as available`);
    });

    it('Step 16: Customer rates the driver', async () => {
      const response = await request(app)
        .post(`/api/rides/${rideId}/rate`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          ratingOverall: 5.0,
          ratingPunctuality: 5.0,
          ratingCare: 4.5,
          ratingCommunication: 5.0,
          comment: 'Excellent service!',
        });

      expect(response.status).toBe(200);

      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
      });

      expect(ride?.customerRatingOverall).toBe(5.0);

      console.log(`✅ Customer rated: 5.0 stars`);
    });
  });

  describe('Scenario 2: Customer Cancellation (Grace Period)', () => {
    let cancelRideId: string;

    it('Step 1: Create ride request', async () => {
      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'CAMIONNETTE',
          loadDescription: 'Test cancellation',
          loadWeight: 50,
          pickupLat: 36.8065,
          pickupLng: 10.1815,
          pickupAddress: 'Tunis',
          dropoffLat: 36.8625,
          dropoffLng: 10.1956,
          dropoffAddress: 'Ariana',
        });

      cancelRideId = response.body.ride.id;
      console.log(`\n✅ Created ride for cancellation test`);
    });

    it('Step 2: Cancel within 5 minutes (no fee)', async () => {
      const response = await request(app)
        .post(`/api/rides/${cancelRideId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Changed my mind',
        });

      expect(response.status).toBe(200);

      const cancellation = await prisma.cancellation.findFirst({
        where: { rideId: cancelRideId },
      });

      expect(cancellation?.withinGracePeriod).toBe(true);
      expect(cancellation?.cancellationFee).toBe(0);

      console.log(`✅ Cancelled within grace period - no fee`);
    });
  });

  describe('Scenario 3: Driver Cancellation (Strike System)', () => {
    let strikeRideId: string;
    let strikeBidId: string;

    it('Step 1: Create and assign ride', async () => {
      // Create ride
      const rideResponse = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'CAMIONNETTE',
          loadDescription: 'Test driver strike',
          loadWeight: 75,
          pickupLat: 36.8065,
          pickupLng: 10.1815,
          pickupAddress: 'Tunis',
          dropoffLat: 36.7469,
          dropoffLng: 10.2178,
          dropoffAddress: 'Ben Arous',
        });

      strikeRideId = rideResponse.body.ride.id;

      // Driver 1 bids
      const bidResponse = await request(app)
        .post(`/api/rides/${strikeRideId}/bid`)
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({
          proposedPrice: 30.0,
          estimatedArrival: 15,
        });

      strikeBidId = bidResponse.body.bid.id;

      // Customer accepts
      await request(app)
        .post(`/api/rides/${strikeRideId}/accept-bid`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bidId: strikeBidId });

      console.log(`\n✅ Ride assigned to Driver 1`);
    });

    it('Step 2: Driver cancels (after grace period)', async () => {
      // Wait a bit (simulate time passing)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get current driver strikes
      const driverBefore = await prisma.driver.findUnique({
        where: { id: driverId1 },
      });
      const strikesBefore = driverBefore?.cancellationStrikes || 0;

      const response = await request(app)
        .post(`/api/rides/${strikeRideId}/cancel`)
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({
          reason: 'Vehicle problem',
        });

      expect(response.status).toBe(200);

      // Verify strike issued
      const cancellation = await prisma.cancellation.findFirst({
        where: { rideId: strikeRideId },
      });

      expect(cancellation?.cancelledBy).toBe('DRIVER');
      expect(cancellation?.strikeIssued).toBe(true);

      const driverAfter = await prisma.driver.findUnique({
        where: { id: driverId1 },
      });

      expect(driverAfter?.cancellationStrikes).toBe(strikesBefore + 1);

      console.log(`✅ Driver cancelled - Strike issued`);
      console.log(`   Strikes: ${strikesBefore} → ${driverAfter?.cancellationStrikes}`);
    });
  });

  describe('Workflow Performance Metrics', () => {
    it('should track complete workflow timing', async () => {
      const startTime = Date.now();

      // Create ride
      const rideResponse = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleType: 'CAMIONNETTE',
          loadDescription: 'Performance test',
          loadWeight: 100,
          pickupLat: 36.8065,
          pickupLng: 10.1815,
          pickupAddress: 'Tunis',
          dropoffLat: 36.8625,
          dropoffLng: 10.1956,
          dropoffAddress: 'Ariana',
        });

      const perfRideId = rideResponse.body.ride.id;

      // Submit bid
      await request(app)
        .post(`/api/rides/${perfRideId}/bid`)
        .set('Authorization', `Bearer ${driverToken1}`)
        .send({ proposedPrice: 25, estimatedArrival: 15 });

      // Accept bid
      const bids = await prisma.bid.findMany({ where: { rideId: perfRideId } });
      await request(app)
        .post(`/api/rides/${perfRideId}/accept-bid`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ bidId: bids[0].id });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`\n📊 Workflow Performance:`);
      console.log(`   Total time: ${duration}ms`);
      console.log(`   Average per step: ${(duration / 3).toFixed(0)}ms`);

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });
});
