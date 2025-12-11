import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Comprehensive Test Data Seed for Truck4u
 *
 * This seed file creates realistic test data covering all features:
 * - Admins, Customers (Individual & Business), Drivers (various statuses)
 * - KYC documents (approved, rejected, pending)
 * - Rides in all statuses
 * - Bids (accepted, rejected, active)
 * - Payments (pending, on hold, completed)
 * - Cancellations with strikes
 * - Subscriptions (driver & B2B)
 * - Wallet transactions
 * - Business orders
 * - Governorate commissions
 */

async function main() {
  console.log('🌱 Starting comprehensive test data seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.businessOrder.deleteMany();
  await prisma.b2BSubscription.deleteMany();
  await prisma.priceEstimate.deleteMany();
  await prisma.driverSubscription.deleteMany();
  await prisma.driverEarnings.deleteMany();
  await prisma.cancellation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.kYCDocument.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.governorateCommission.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.admin.deleteMany();

  // ============================================
  // 1. CREATE ADMINS
  // ============================================
  console.log('👤 Creating admins...');

  const superAdmin = await prisma.admin.create({
    data: {
      email: 'admin@truck4u.tn',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  const moderator = await prisma.admin.create({
    data: {
      email: 'moderator@truck4u.tn',
      name: 'Moderator Admin',
      role: 'MODERATOR',
      isActive: true,
    },
  });

  console.log(`✅ Created ${2} admins`);

  // ============================================
  // 2. CREATE CUSTOMERS
  // ============================================
  console.log('👥 Creating customers...');

  // Individual customers
  const customer1 = await prisma.customer.create({
    data: {
      phone: '+21612345001',
      name: 'Ahmed Ben Ali',
      email: 'ahmed@gmail.com',
      accountType: 'INDIVIDUAL',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      phone: '+21612345002',
      name: 'Fatma Kharrat',
      email: 'fatma@gmail.com',
      accountType: 'INDIVIDUAL',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      phone: '+21612345003',
      name: 'Mohamed Trabelsi',
      accountType: 'INDIVIDUAL',
    },
  });

  // Business customers
  const businessCustomer1 = await prisma.customer.create({
    data: {
      phone: '+21612345010',
      name: 'Société Import Export',
      email: 'contact@importexport.tn',
      accountType: 'BUSINESS',
      companyName: 'Import Export SARL',
      taxId: 'TN1234567A',
      isB2BSubscriber: true,
      businessAddress: '123 Avenue Habib Bourguiba, Tunis',
      businessStreet: 'Avenue Habib Bourguiba',
      businessHouseNumber: '123',
      businessCity: 'Tunis',
      businessPostcode: '1000',
      businessLat: 36.8065,
      businessLng: 10.1815,
    },
  });

  const businessCustomer2 = await prisma.customer.create({
    data: {
      phone: '+21612345011',
      name: 'Restaurant Le Gourmet',
      email: 'contact@legourmet.tn',
      accountType: 'BUSINESS',
      companyName: 'Le Gourmet SARL',
      taxId: 'TN7654321B',
      isB2BSubscriber: false,
      businessAddress: '45 Rue de la République, Sfax',
      businessCity: 'Sfax',
      businessLat: 34.7406,
      businessLng: 10.7603,
    },
  });

  console.log(`✅ Created ${5} customers`);

  // ============================================
  // 3. CREATE DRIVERS
  // ============================================
  console.log('🚚 Creating drivers...');

  // Approved driver with high rating
  const driver1 = await prisma.driver.create({
    data: {
      phone: '+21698765001',
      name: 'Karim Mansour',
      email: 'karim@driver.com',
      verificationStatus: 'APPROVED',
      hasBusinessLicense: true,
      businessLicenseNumber: 'BL123456',
      hasPatente: true,
      patenteNumber: 'PT789012',
      patenteExpiryDate: new Date('2025-12-31'),
      isAvailable: true,
      vehicleType: 'CAMIONNETTE',
      vehiclePlate: '123 TU 1234',
      vehicleBrand: 'Peugeot',
      vehicleModel: 'Partner',
      vehicleYear: 2020,
      vehicleColor: 'Blanc',
      rating: 4.8,
      ratingPunctuality: 4.9,
      ratingCare: 4.7,
      ratingCommunication: 4.8,
      totalRides: 150,
      completedRides: 145,
      acceptedBids: 120,
      totalBids: 180,
      acceptanceRate: 66.7,
      tier: 'GOLD',
      platformFeeRate: 0.05,
      totalEarnings: 15420.50,
      currentLat: 36.8065,
      currentLng: 10.1815,
      homeLocation: { lat: 36.8065, lng: 10.1815, address: 'Tunis' },
      weeklySchedule: {
        monday: [{ start: '08:00', end: '18:00' }],
        tuesday: [{ start: '08:00', end: '18:00' }],
        wednesday: [{ start: '08:00', end: '18:00' }],
        thursday: [{ start: '08:00', end: '18:00' }],
        friday: [{ start: '08:00', end: '16:00' }],
        saturday: [{ start: '09:00', end: '14:00' }],
      },
      hasActiveSubscription: true,
      subscriptionTier: 'PREMIUM',
    },
  });

  // Approved driver - available
  const driver2 = await prisma.driver.create({
    data: {
      phone: '+21698765002',
      name: 'Youssef Gharbi',
      verificationStatus: 'APPROVED',
      hasPatente: true,
      patenteNumber: 'PT345678',
      isAvailable: true,
      vehicleType: 'FOURGON',
      vehiclePlate: '456 TU 5678',
      vehicleBrand: 'Renault',
      vehicleModel: 'Master',
      vehicleYear: 2019,
      rating: 4.5,
      totalRides: 80,
      completedRides: 75,
      tier: 'SILVER',
      platformFeeRate: 0.08,
      totalEarnings: 8200.00,
      currentLat: 36.8625,
      currentLng: 10.1956,
    },
  });

  // Approved driver - busy
  const driver3 = await prisma.driver.create({
    data: {
      phone: '+21698765003',
      name: 'Mehdi Bouazizi',
      verificationStatus: 'APPROVED',
      isAvailable: false, // Currently on a ride
      vehicleType: 'CAMION_3_5T',
      vehiclePlate: '789 TU 9012',
      vehicleBrand: 'Isuzu',
      vehicleModel: 'N-Series',
      vehicleYear: 2021,
      rating: 4.6,
      totalRides: 60,
      completedRides: 58,
      tier: 'BRONZE',
      platformFeeRate: 0.10,
      totalEarnings: 9800.00,
    },
  });

  // Pending review driver
  const driver4 = await prisma.driver.create({
    data: {
      phone: '+21698765004',
      name: 'Riadh Hamdi',
      verificationStatus: 'PENDING_REVIEW',
      vehicleType: 'CAMIONNETTE',
      vehiclePlate: '321 TU 4321',
      isAvailable: false,
      rating: 0,
      tier: 'BRONZE',
    },
  });

  // Rejected driver
  const driver5 = await prisma.driver.create({
    data: {
      phone: '+21698765005',
      name: 'Sami Jlassi',
      verificationStatus: 'REJECTED',
      rejectionReason: 'Documents illisibles. Veuillez soumettre des photos plus claires.',
      vehicleType: 'FOURGON',
      isAvailable: false,
      rating: 0,
      tier: 'BRONZE',
    },
  });

  // Driver with strikes
  const driver6 = await prisma.driver.create({
    data: {
      phone: '+21698765006',
      name: 'Nabil Zouari',
      verificationStatus: 'APPROVED',
      vehicleType: 'CAMIONNETTE',
      vehiclePlate: '555 TU 6666',
      isAvailable: true,
      rating: 3.8,
      totalRides: 40,
      completedRides: 35,
      cancellationStrikes: 2, // Has 2 strikes
      tier: 'BRONZE',
    },
  });

  // Deactivated driver
  const driver7 = await prisma.driver.create({
    data: {
      phone: '+21698765007',
      name: 'Hichem Dridi',
      verificationStatus: 'APPROVED',
      vehicleType: 'CAMION_LOURD',
      isAvailable: false,
      isDeactivated: true,
      deactivatedAt: new Date('2025-11-01'),
      deactivationReason: 'Comportement inapproprié signalé par plusieurs clients',
      rating: 3.2,
      tier: 'BRONZE',
    },
  });

  console.log(`✅ Created ${7} drivers`);

  // ============================================
  // 4. CREATE KYC DOCUMENTS
  // ============================================
  console.log('📄 Creating KYC documents...');

  // Driver 1 - All approved
  await prisma.kYCDocument.createMany({
    data: [
      {
        driverId: driver1.id,
        documentType: 'DRIVER_LICENSE',
        fileUrl: 'https://storage.truck4u.tn/kyc/driver1_license.jpg',
        fileName: 'driver_license.jpg',
        fileSize: 245600,
        mimeType: 'image/jpeg',
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
        verifiedBy: superAdmin.id,
      },
      {
        driverId: driver1.id,
        documentType: 'VEHICLE_REGISTRATION',
        fileUrl: 'https://storage.truck4u.tn/kyc/driver1_registration.jpg',
        fileName: 'vehicle_registration.jpg',
        fileSize: 198400,
        mimeType: 'image/jpeg',
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
      },
      {
        driverId: driver1.id,
        documentType: 'INSURANCE',
        fileUrl: 'https://storage.truck4u.tn/kyc/driver1_insurance.pdf',
        fileName: 'insurance.pdf',
        fileSize: 512000,
        mimeType: 'application/pdf',
        verificationStatus: 'APPROVED',
        verifiedAt: new Date(),
        expiresAt: new Date('2026-06-30'),
      },
    ],
  });

  // Driver 4 - Pending review
  await prisma.kYCDocument.createMany({
    data: [
      {
        driverId: driver4.id,
        documentType: 'DRIVER_LICENSE',
        fileUrl: 'https://storage.truck4u.tn/kyc/driver4_license.jpg',
        fileName: 'license.jpg',
        fileSize: 256000,
        mimeType: 'image/jpeg',
        verificationStatus: 'PENDING',
      },
      {
        driverId: driver4.id,
        documentType: 'VEHICLE_REGISTRATION',
        fileUrl: 'https://storage.truck4u.tn/kyc/driver4_registration.jpg',
        fileName: 'registration.jpg',
        fileSize: 178000,
        mimeType: 'image/jpeg',
        verificationStatus: 'PENDING',
      },
    ],
  });

  // Driver 5 - Rejected
  await prisma.kYCDocument.create({
    data: {
      driverId: driver5.id,
      documentType: 'DRIVER_LICENSE',
      fileUrl: 'https://storage.truck4u.tn/kyc/driver5_license.jpg',
      fileName: 'license_blurry.jpg',
      fileSize: 156000,
      mimeType: 'image/jpeg',
      verificationStatus: 'REJECTED',
      verificationNotes: 'Photo floue, impossible de lire les informations',
      verifiedAt: new Date(),
      verifiedBy: moderator.id,
    },
  });

  console.log(`✅ Created KYC documents`);

  // ============================================
  // 5. CREATE GOVERNORATE COMMISSIONS
  // ============================================
  console.log('🗺️ Creating governorate commissions...');

  await prisma.governorateCommission.createMany({
    data: [
      { governorate: 'Tunis', commissionRate: 0.08, notes: 'Région dense - commission réduite' },
      { governorate: 'Sfax', commissionRate: 0.09, notes: 'Deuxième ville' },
      { governorate: 'Tataouine', commissionRate: 0.05, notes: 'Région éloignée - encourage conducteurs' },
      { governorate: 'Tozeur', commissionRate: 0.06, notes: 'Tourisme - tarif attractif' },
    ],
  });

  console.log(`✅ Created governorate commissions`);

  // ============================================
  // 6. CREATE PRICING CONFIGS
  // ============================================
  console.log('💰 Creating pricing configurations...');

  await prisma.vehiclePricing.createMany({
    data: [
      { vehicleType: 'CAMIONNETTE', pricePerKm: 0.8, pricePerHour: 15, minimumPrice: 10 },
      { vehicleType: 'FOURGON', pricePerKm: 1.2, pricePerHour: 20, minimumPrice: 15 },
      { vehicleType: 'CAMION_3_5T', pricePerKm: 1.8, pricePerHour: 30, minimumPrice: 25 },
      { vehicleType: 'CAMION_LOURD', pricePerKm: 2.5, pricePerHour: 45, minimumPrice: 40 },
    ],
  });

  await prisma.pricingConfig.create({
    data: {
      convoyeurPrice: 20,
      tripSimpleCoeff: 1.0,
      tripReturnCoeff: 1.8,
      peakHoursCoeff: 1.2,
      nightHoursCoeff: 1.3,
      weekendCoeff: 1.1,
      trafficFluidCoeff: 1.0,
      trafficMoyenCoeff: 1.1,
      trafficDenseCoeff: 1.25,
    },
  });

  console.log(`✅ Created pricing configurations`);

  // ============================================
  // 7. CREATE RIDES WITH VARIOUS STATUSES
  // ============================================
  console.log('🚛 Creating rides...');

  // Ride 1: Pending bids
  const ride1 = await prisma.ride.create({
    data: {
      customerId: customer1.id,
      status: 'PENDING_BIDS',
      vehicleType: 'CAMIONNETTE',
      loadDescription: 'Cartons de vêtements',
      loadWeight: 150,
      loadAssistance: false,
      pickupLat: 36.8065,
      pickupLng: 10.1815,
      pickupAddress: 'Avenue Habib Bourguiba, Tunis',
      dropoffLat: 36.8625,
      dropoffLng: 10.1956,
      dropoffAddress: 'Centre Ville, Ariana',
      distance: 8.5,
      estimatedDuration: 25,
      estimatedPrice: 25.50,
      scheduledPickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // In 2 hours
    },
  });

  // Ride 2: Driver arriving
  const ride2 = await prisma.ride.create({
    data: {
      customerId: customer2.id,
      driverId: driver3.id,
      status: 'DRIVER_ARRIVING',
      vehicleType: 'CAMION_3_5T',
      loadDescription: 'Meubles de salon',
      loadWeight: 500,
      loadAssistance: true,
      pickupLat: 36.7469,
      pickupLng: 10.2178,
      pickupAddress: 'Ben Arous Centre',
      dropoffLat: 36.4561,
      dropoffLng: 10.7376,
      dropoffAddress: 'Nabeul Ville',
      distance: 65,
      estimatedDuration: 75,
      estimatedPrice: 145.00,
      finalPrice: 150.00,
      driverEarnings: 135.00,
      platformFee: 15.00,
      scheduledPickupTime: new Date(),
      acceptedAt: new Date(Date.now() - 15 * 60 * 1000), // Accepted 15 min ago
    },
  });

  // Ride 3: In transit
  const ride3 = await prisma.ride.create({
    data: {
      customerId: customer1.id,
      driverId: driver1.id,
      status: 'IN_TRANSIT',
      vehicleType: 'CAMIONNETTE',
      loadDescription: 'Électroménager',
      loadWeight: 200,
      loadAssistance: false,
      pickupLat: 36.8065,
      pickupLng: 10.1815,
      pickupAddress: 'Tunis Centre',
      dropoffLat: 36.8099,
      dropoffLng: 10.0969,
      dropoffAddress: 'Manouba',
      distance: 12,
      estimatedDuration: 30,
      estimatedPrice: 28.00,
      finalPrice: 28.00,
      driverEarnings: 26.60,
      platformFee: 1.40,
      scheduledPickupTime: new Date(Date.now() - 45 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 60 * 60 * 1000),
      pickupArrivedAt: new Date(Date.now() - 50 * 60 * 1000),
      pickupCompletedAt: new Date(Date.now() - 40 * 60 * 1000),
    },
  });

  // Ride 4: Completed
  const ride4 = await prisma.ride.create({
    data: {
      customerId: customer3.id,
      driverId: driver1.id,
      status: 'COMPLETED',
      vehicleType: 'FOURGON',
      loadDescription: 'Matériel de construction',
      loadWeight: 400,
      loadAssistance: true,
      pickupLat: 35.8256,
      pickupLng: 10.6369,
      pickupAddress: 'Sousse Ville',
      dropoffLat: 35.7775,
      dropoffLng: 10.8262,
      dropoffAddress: 'Monastir',
      distance: 22,
      estimatedDuration: 35,
      estimatedPrice: 55.00,
      finalPrice: 55.00,
      driverEarnings: 52.25,
      platformFee: 2.75,
      customerRatingOverall: 5.0,
      customerRatingPunctuality: 5.0,
      customerRatingCare: 5.0,
      customerRatingCommunication: 5.0,
      customerComment: 'Excellent service, très professionnel!',
      scheduledPickupTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
      pickupArrivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      pickupCompletedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      dropoffArrivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    },
  });

  // Ride 5: Cancelled by customer (within grace period)
  const ride5 = await prisma.ride.create({
    data: {
      customerId: customer2.id,
      status: 'CANCELLED',
      vehicleType: 'CAMIONNETTE',
      loadDescription: 'Cartons',
      loadWeight: 50,
      pickupLat: 36.8065,
      pickupLng: 10.1815,
      pickupAddress: 'Tunis',
      dropoffLat: 36.8625,
      dropoffLng: 10.1956,
      dropoffAddress: 'Ariana',
      distance: 8,
      estimatedDuration: 20,
      estimatedPrice: 20.00,
      cancelledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      cancelledBy: 'customer',
      cancellationReason: 'Changement de plans',
    },
  });

  // Ride 6: Cancelled by driver (with strike)
  const ride6 = await prisma.ride.create({
    data: {
      customerId: customer1.id,
      driverId: driver6.id,
      status: 'CANCELLED',
      vehicleType: 'CAMIONNETTE',
      loadDescription: 'Colis',
      loadWeight: 30,
      pickupLat: 36.8065,
      pickupLng: 10.1815,
      pickupAddress: 'Tunis',
      dropoffLat: 36.7469,
      dropoffLng: 10.2178,
      dropoffAddress: 'Ben Arous',
      distance: 15,
      estimatedDuration: 30,
      estimatedPrice: 30.00,
      finalPrice: 30.00,
      acceptedAt: new Date(Date.now() - 35 * 60 * 1000),
      cancelledAt: new Date(Date.now() - 5 * 60 * 1000),
      cancelledBy: 'driver',
      cancellationReason: 'Problème technique véhicule',
    },
  });

  // Business ride - Completed
  const ride7 = await prisma.ride.create({
    data: {
      customerId: businessCustomer1.id,
      driverId: driver2.id,
      status: 'COMPLETED',
      vehicleType: 'FOURGON',
      loadDescription: 'Marchandises import',
      loadWeight: 600,
      loadAssistance: false,
      pickupLat: 36.8065,
      pickupLng: 10.1815,
      pickupAddress: 'Port de La Goulette, Tunis',
      dropoffLat: 36.8065,
      dropoffLng: 10.1815,
      dropoffAddress: '123 Avenue Habib Bourguiba, Tunis',
      distance: 10,
      estimatedDuration: 25,
      estimatedPrice: 40.00,
      finalPrice: 38.00, // B2B discount
      driverEarnings: 36.10,
      platformFee: 1.90,
      customerRatingOverall: 4.5,
      scheduledPickupTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Created ${7} rides`);

  // ============================================
  // 8. CREATE BIDS
  // ============================================
  console.log('💵 Creating bids...');

  // Bids for ride1 (pending bids)
  await prisma.bid.createMany({
    data: [
      {
        rideId: ride1.id,
        driverId: driver1.id,
        proposedPrice: 24.00,
        estimatedArrival: 15,
        message: 'Disponible immédiatement, service premium',
        status: 'ACTIVE',
      },
      {
        rideId: ride1.id,
        driverId: driver2.id,
        proposedPrice: 26.00,
        estimatedArrival: 20,
        status: 'ACTIVE',
      },
      {
        rideId: ride1.id,
        driverId: driver6.id,
        proposedPrice: 22.50,
        estimatedArrival: 25,
        message: 'Meilleur prix garanti',
        status: 'ACTIVE',
      },
    ],
  });

  // Accepted bid for ride2
  await prisma.bid.create({
    data: {
      rideId: ride2.id,
      driverId: driver3.id,
      proposedPrice: 150.00,
      estimatedArrival: 20,
      status: 'ACCEPTED',
      acceptedAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  // Rejected bids for ride2
  await prisma.bid.createMany({
    data: [
      {
        rideId: ride2.id,
        driverId: driver1.id,
        proposedPrice: 155.00,
        estimatedArrival: 30,
        status: 'REJECTED',
      },
      {
        rideId: ride2.id,
        driverId: driver2.id,
        proposedPrice: 148.00,
        estimatedArrival: 25,
        status: 'REJECTED',
      },
    ],
  });

  console.log(`✅ Created bids`);

  // ============================================
  // 9. CREATE PAYMENTS
  // ============================================
  console.log('💳 Creating payments...');

  // Pending payment for ride2
  await prisma.payment.create({
    data: {
      rideId: ride2.id,
      customerId: customer2.id,
      driverId: driver3.id,
      method: 'CASH',
      status: 'PENDING',
      totalAmount: 150.00,
      platformFee: 15.00,
      driverAmount: 135.00,
    },
  });

  // On hold payment for ride3
  await prisma.payment.create({
    data: {
      rideId: ride3.id,
      customerId: customer1.id,
      driverId: driver1.id,
      method: 'CASH',
      status: 'ON_HOLD',
      totalAmount: 28.00,
      platformFee: 1.40,
      driverAmount: 26.60,
      onHoldAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  });

  // Completed payment for ride4
  await prisma.payment.create({
    data: {
      rideId: ride4.id,
      customerId: customer3.id,
      driverId: driver1.id,
      method: 'CARD',
      status: 'COMPLETED',
      totalAmount: 55.00,
      platformFee: 2.75,
      driverAmount: 52.25,
      completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      cardLast4: '4242',
      cardBrand: 'Visa',
    },
  });

  // Completed payment for ride7 (business)
  await prisma.payment.create({
    data: {
      rideId: ride7.id,
      customerId: businessCustomer1.id,
      driverId: driver2.id,
      method: 'FLOUCI',
      status: 'COMPLETED',
      totalAmount: 38.00,
      platformFee: 1.90,
      driverAmount: 36.10,
      completedAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Created payments`);

  // ============================================
  // 10. CREATE CANCELLATIONS
  // ============================================
  console.log('❌ Creating cancellations...');

  // Customer cancellation (within grace period)
  await prisma.cancellation.create({
    data: {
      rideId: ride5.id,
      customerId: customer2.id,
      cancelledBy: 'CUSTOMER',
      reason: 'Changement de plans de dernière minute',
      withinGracePeriod: true,
      cancellationFee: 0,
      strikeIssued: false,
    },
  });

  // Driver cancellation with strike
  const cancellation2 = await prisma.cancellation.create({
    data: {
      rideId: ride6.id,
      customerId: customer1.id,
      driverId: driver6.id,
      cancelledBy: 'DRIVER',
      reason: 'Panne véhicule',
      withinGracePeriod: false,
      cancellationFee: 0,
      strikeIssued: true,
    },
  });

  console.log(`✅ Created cancellations`);

  // ============================================
  // 11. CREATE DRIVER EARNINGS
  // ============================================
  console.log('💰 Creating driver earnings...');

  await prisma.driverEarnings.createMany({
    data: [
      {
        driverId: driver1.id,
        rideId: ride4.id,
        grossAmount: 55.00,
        platformFee: 2.75,
        netEarnings: 52.25,
      },
      {
        driverId: driver2.id,
        rideId: ride7.id,
        grossAmount: 38.00,
        platformFee: 1.90,
        netEarnings: 36.10,
      },
    ],
  });

  console.log(`✅ Created driver earnings`);

  // ============================================
  // 12. CREATE SUBSCRIPTIONS
  // ============================================
  console.log('💎 Creating subscriptions...');

  // Driver subscription (premium)
  await prisma.driverSubscription.create({
    data: {
      driverId: driver1.id,
      tier: 'PREMIUM',
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
      monthlyFee: 49.00,
      platformFeeDiscount: 0.05, // 5% discount
      status: 'ACTIVE',
      paymentMethod: 'CARD',
      autoRenew: true,
    },
  });

  // B2B subscription
  await prisma.b2BSubscription.create({
    data: {
      customerId: businessCustomer1.id,
      tier: 'PREMIUM',
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      monthlyFee: 99.00,
      platformFeeDiscount: 0.05,
      includedRides: 50,
      usedRides: 8,
      status: 'ACTIVE',
      paymentMethod: 'BANK_TRANSFER',
      autoRenew: true,
    },
  });

  console.log(`✅ Created subscriptions`);

  // ============================================
  // 13. CREATE WALLETS & TRANSACTIONS
  // ============================================
  console.log('💰 Creating wallets and transactions...');

  // Wallet for customer1
  const wallet1 = await prisma.wallet.create({
    data: {
      customerId: customer1.id,
      balance: 500.00,
      heldAmount: 28.00, // Amount for ride3 on hold
      availableAmount: 472.00,
    },
  });

  await prisma.walletTransaction.createMany({
    data: [
      {
        walletId: wallet1.id,
        type: 'DEPOSIT',
        amount: 500.00,
        balanceBefore: 0,
        balanceAfter: 500.00,
        status: 'COMPLETED',
        description: 'Recharge initiale',
        metadata: { method: 'CARD' },
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        walletId: wallet1.id,
        rideId: ride3.id,
        type: 'HOLD',
        amount: 28.00,
        balanceBefore: 500.00,
        balanceAfter: 500.00, // Balance doesn't change, but held increases
        status: 'COMPLETED',
        description: 'Blocage pour course en cours',
        completedAt: new Date(Date.now() - 40 * 60 * 1000),
      },
    ],
  });

  // Wallet for customer2
  const wallet2 = await prisma.wallet.create({
    data: {
      customerId: customer2.id,
      balance: 150.00,
      heldAmount: 0,
      availableAmount: 150.00,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      walletId: wallet2.id,
      type: 'DEPOSIT',
      amount: 150.00,
      balanceBefore: 0,
      balanceAfter: 150.00,
      status: 'COMPLETED',
      description: 'Première recharge',
      metadata: { method: 'FLOUCI', reference: 'FL123456' },
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`✅ Created wallets and transactions`);

  // ============================================
  // 14. CREATE BUSINESS ORDERS
  // ============================================
  console.log('📦 Creating business orders...');

  await prisma.businessOrder.createMany({
    data: [
      {
        customerId: businessCustomer1.id,
        driverId: driver2.id,
        orderType: 'RECURRING',
        frequency: 'WEEKLY',
        status: 'CONFIRMED',
        vehicleType: 'FOURGON',
        pickupLat: 36.8065,
        pickupLng: 10.1815,
        pickupAddress: 'Import Export SARL, Tunis',
        dropoffLat: 34.7406,
        dropoffLng: 10.7603,
        dropoffAddress: 'Entrepôt Sfax',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedPrice: 180.00,
        assignmentType: 'PREFERRED_DRIVER',
      },
      {
        customerId: businessCustomer1.id,
        orderType: 'ON_DEMAND',
        status: 'PENDING',
        vehicleType: 'CAMION_3_5T',
        pickupLat: 36.8065,
        pickupLng: 10.1815,
        pickupAddress: 'Import Export SARL, Tunis',
        dropoffLat: 35.8256,
        dropoffLng: 10.6369,
        dropoffAddress: 'Client Sousse',
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        estimatedPrice: 120.00,
        assignmentType: 'AUTO_MATCH',
      },
    ],
  });

  console.log(`✅ Created business orders`);

  // ============================================
  // 15. CREATE PRICE ESTIMATES
  // ============================================
  console.log('📊 Creating price estimates...');

  await prisma.priceEstimate.createMany({
    data: [
      {
        customerId: customer1.id,
        vehicleType: 'CAMIONNETTE',
        distance: 15.5,
        duration: 35,
        tripType: 'ALLER_SIMPLE',
        hasConvoyeur: false,
        basePrice: 35.20,
        finalPrice: 35.20,
        breakdown: {
          distanceCost: 12.40,
          durationCost: 8.75,
          minimumPrice: 10.00,
          convoyeurPrice: 0,
          coefficients: { tripType: 1.0, timeOfDay: 1.0, traffic: 1.0 },
        },
      },
      {
        customerId: businessCustomer1.id,
        vehicleType: 'FOURGON',
        distance: 220,
        duration: 180,
        tripType: 'ALLER_RETOUR',
        hasConvoyeur: true,
        basePrice: 380.00,
        finalPrice: 380.00,
        breakdown: {
          distanceCost: 264.00,
          durationCost: 60.00,
          convoyeurPrice: 20.00,
          coefficients: { tripType: 1.8, timeOfDay: 1.0, traffic: 1.0 },
        },
      },
    ],
  });

  console.log(`✅ Created price estimates`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n✅ ========== SEED COMPLETED ==========');
  console.log(`
📊 Test Data Summary:

  👤 Admins: 2
     - Super Admin (admin@truck4u.tn)
     - Moderator (moderator@truck4u.tn)

  👥 Customers: 5
     - 3 Individual customers
     - 2 Business customers (1 with B2B subscription)

  🚚 Drivers: 7
     - 3 Approved & available
     - 1 Approved & busy (on ride)
     - 1 Pending review
     - 1 Rejected
     - 1 With 2 strikes
     - 1 Deactivated

  📄 KYC Documents: Various statuses
     - Approved, Pending, Rejected

  🗺️ Governorate Commissions: 4
     - Tunis (8%), Sfax (9%), Tataouine (5%), Tozeur (6%)

  🚛 Rides: 7
     - Pending bids (1)
     - Driver arriving (1)
     - In transit (1)
     - Completed with ratings (2)
     - Cancelled (2)

  💵 Bids: 8
     - Active (3)
     - Accepted (1)
     - Rejected (2)

  💳 Payments: 4
     - Pending, On Hold, Completed (various methods)

  💰 Wallets: 2
     - With deposits and hold transactions

  💎 Subscriptions:
     - 1 Driver Premium subscription (active)
     - 1 B2B Premium subscription (active)

  📦 Business Orders: 2
     - Recurring weekly order
     - On-demand pending order

🧪 Ready for comprehensive testing!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
