import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding workflow test data...');

  // 1. Create test customer
  const customer = await prisma.customer.upsert({
    where: { phone: '+21650000001' },
    update: {},
    create: {
      phone: '+21650000001',
      name: 'Ahmed Test Client',
      email: 'ahmed@test.com',
      accountType: 'INDIVIDUAL',
      isB2BSubscriber: false,
    },
  });
  console.log('✅ Customer created:', customer.name);

  // 2. Create test drivers
  const driver1 = await prisma.driver.upsert({
    where: { phone: '+21650000010' },
    update: {},
    create: {
      phone: '+21650000010',
      name: 'Mohamed Transporteur',
      email: 'mohamed@test.com',
      verificationStatus: 'APPROVED',
      vehicleType: 'CAMIONNETTE',
      vehiclePlate: '123 TU 1234',
      isAvailable: true,
      rating: 4.8,
      totalRides: 45,
      totalEarnings: 1250.0,
      currentLocation: {
        lat: 36.8065,
        lng: 10.1815,
        timestamp: new Date().toISOString(),
      },
      documents: {
        cin_front: 'https://example.com/cin_front.jpg',
        cin_back: 'https://example.com/cin_back.jpg',
        license: 'https://example.com/license.jpg',
        vehicle_reg: 'https://example.com/vehicle_reg.jpg',
      },
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { phone: '+21650000011' },
    update: {},
    create: {
      phone: '+21650000011',
      name: 'Karim Express',
      email: 'karim@test.com',
      verificationStatus: 'APPROVED',
      vehicleType: 'CAMIONNETTE',
      vehiclePlate: '456 TU 5678',
      isAvailable: true,
      rating: 4.5,
      totalRides: 32,
      totalEarnings: 890.0,
      currentLocation: {
        lat: 36.8125,
        lng: 10.1795,
        timestamp: new Date().toISOString(),
      },
      documents: {
        cin_front: 'https://example.com/cin_front.jpg',
        cin_back: 'https://example.com/cin_back.jpg',
        license: 'https://example.com/license.jpg',
        vehicle_reg: 'https://example.com/vehicle_reg.jpg',
      },
    },
  });

  console.log('✅ Drivers created:', driver1.name, driver2.name);

  // 3. Create test rides in different stages

  // Ride 1: PENDING_BIDS - Client waiting for offers
  const ride1 = await prisma.ride.create({
    data: {
      customerId: customer.id,
      status: 'PENDING_BIDS',
      pickup: {
        lat: 36.8065,
        lng: 10.1815,
        address: 'Avenue Habib Bourguiba, Tunis',
        details: 'Devant la poste centrale',
      },
      dropoff: {
        lat: 36.8125,
        lng: 10.1795,
        address: 'La Marsa, Tunis',
        details: 'Villa avec portail bleu',
      },
      distance: 15.5,
      estimatedDuration: 30,
      vehicleType: 'CAMIONNETTE',
      loadAssistance: true,
      numberOfTrips: 1,
      itemPhotos: [],
      description: 'Déménagement de meubles - Canapé 3 places + table',
      serviceType: 'IMMEDIATE',
      estimatedMinPrice: 45,
      estimatedMaxPrice: 65,
    },
  });

  // Add bids from both drivers to ride1
  await prisma.bid.createMany({
    data: [
      {
        rideId: ride1.id,
        driverId: driver1.id,
        proposedPrice: 55,
        estimatedArrival: 15,
        message: 'Je peux venir dans 15 minutes. J\'ai de l\'expérience en déménagement.',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      {
        rideId: ride1.id,
        driverId: driver2.id,
        proposedPrice: 50,
        estimatedArrival: 20,
        message: 'Meilleur prix! Disponible immédiatement.',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    ],
  });

  console.log('✅ Ride 1 created (PENDING_BIDS) with 2 bids');

  // Ride 2: BID_ACCEPTED - Client accepted bid, needs to pay
  const ride2 = await prisma.ride.create({
    data: {
      customerId: customer.id,
      driverId: driver1.id,
      status: 'BID_ACCEPTED',
      pickup: {
        lat: 36.8165,
        lng: 10.1715,
        address: 'Rue de Marseille, Tunis',
        details: 'Immeuble 15, 3ème étage',
      },
      dropoff: {
        lat: 36.8325,
        lng: 10.2095,
        address: 'Centre Urbain Nord, Tunis',
        details: 'Bureaux TechPark',
      },
      distance: 8.2,
      estimatedDuration: 20,
      vehicleType: 'CAMIONNETTE',
      loadAssistance: false,
      numberOfTrips: 1,
      itemPhotos: [],
      description: 'Transport de cartons de bureau',
      serviceType: 'IMMEDIATE',
      estimatedMinPrice: 25,
      estimatedMaxPrice: 35,
      finalPrice: 30,
    },
  });

  const bid2 = await prisma.bid.create({
    data: {
      rideId: ride2.id,
      driverId: driver1.id,
      proposedPrice: 30,
      estimatedArrival: 10,
      status: 'ACCEPTED',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await prisma.ride.update({
    where: { id: ride2.id },
    data: { winningBidId: bid2.id },
  });

  // Create pending payment for ride2
  await prisma.payment.create({
    data: {
      rideId: ride2.id,
      method: 'CARD',
      totalAmount: 30,
      platformFee: 4.5,
      driverAmount: 25.5,
      status: 'PENDING',
    },
  });

  console.log('✅ Ride 2 created (BID_ACCEPTED) - Ready for payment');

  // Ride 3: IN_TRANSIT - Driver is delivering
  const ride3 = await prisma.ride.create({
    data: {
      customerId: customer.id,
      driverId: driver2.id,
      status: 'IN_TRANSIT',
      pickup: {
        lat: 36.8065,
        lng: 10.1815,
        address: 'Bab Bhar, Tunis',
      },
      dropoff: {
        lat: 36.8425,
        lng: 10.2395,
        address: 'Ariana Ville',
      },
      distance: 12.0,
      estimatedDuration: 25,
      vehicleType: 'CAMIONNETTE',
      loadAssistance: true,
      numberOfTrips: 1,
      itemPhotos: [],
      description: 'Livraison électroménager',
      serviceType: 'IMMEDIATE',
      estimatedMinPrice: 35,
      estimatedMaxPrice: 50,
      finalPrice: 42,
    },
  });

  await prisma.payment.create({
    data: {
      rideId: ride3.id,
      method: 'CARD',
      totalAmount: 42,
      platformFee: 6.3,
      driverAmount: 35.7,
      status: 'PENDING',
    },
  });

  console.log('✅ Ride 3 created (IN_TRANSIT)');

  // Ride 4: DROPOFF_ARRIVED - Ready for dual confirmation
  const ride4 = await prisma.ride.create({
    data: {
      customerId: customer.id,
      driverId: driver1.id,
      status: 'DROPOFF_ARRIVED',
      pickup: {
        lat: 36.8365,
        lng: 10.1815,
        address: 'Lac 1, Tunis',
      },
      dropoff: {
        lat: 36.8125,
        lng: 10.1695,
        address: 'Carthage, Tunis',
      },
      distance: 6.5,
      estimatedDuration: 15,
      vehicleType: 'CAMIONNETTE',
      loadAssistance: false,
      numberOfTrips: 1,
      itemPhotos: [],
      description: 'Livraison de colis',
      serviceType: 'IMMEDIATE',
      estimatedMinPrice: 20,
      estimatedMaxPrice: 28,
      finalPrice: 24,
      proofPhotos: {
        loading: 'https://example.com/loading.jpg',
        loading_timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        driverConfirmedCompletion: true,
        driverConfirmedAt: new Date().toISOString(),
      },
    },
  });

  await prisma.payment.create({
    data: {
      rideId: ride4.id,
      method: 'CASH',
      totalAmount: 24,
      platformFee: 3.6,
      driverAmount: 20.4,
      status: 'PENDING',
    },
  });

  console.log('✅ Ride 4 created (DROPOFF_ARRIVED) - Driver confirmed, waiting for customer');

  // Ride 5: COMPLETED - Completed and rated
  const ride5 = await prisma.ride.create({
    data: {
      customerId: customer.id,
      driverId: driver2.id,
      status: 'COMPLETED',
      pickup: {
        lat: 36.8065,
        lng: 10.1815,
        address: 'Avenue de France, Tunis',
      },
      dropoff: {
        lat: 36.8525,
        lng: 10.2195,
        address: 'Soukra, Ariana',
      },
      distance: 10.0,
      estimatedDuration: 22,
      vehicleType: 'CAMIONNETTE',
      loadAssistance: true,
      numberOfTrips: 1,
      itemPhotos: [],
      description: 'Transport de matériel informatique',
      serviceType: 'IMMEDIATE',
      estimatedMinPrice: 30,
      estimatedMaxPrice: 42,
      finalPrice: 36,
      customerRating: 5,
      customerReview: 'Excellent service! Très professionnel.',
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      proofPhotos: {
        loading: 'https://example.com/loading.jpg',
        delivery: 'https://example.com/delivery.jpg',
        driverConfirmedCompletion: true,
        driverConfirmedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    },
  });

  await prisma.payment.create({
    data: {
      rideId: ride5.id,
      method: 'CARD',
      totalAmount: 36,
      platformFee: 5.4,
      driverAmount: 30.6,
      status: 'COMPLETED',
      completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      transactionRef: 'TXN_' + Date.now(),
    },
  });

  await prisma.driverEarnings.create({
    data: {
      driverId: driver2.id,
      rideId: ride5.id,
      grossAmount: 36,
      platformFee: 5.4,
      netEarnings: 30.6,
      paidAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Ride 5 created (COMPLETED) - Already rated');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📝 Test credentials:');
  console.log('  Customer: +21650000001');
  console.log('  Driver 1: +21650000010 (Mohamed)');
  console.log('  Driver 2: +21650000011 (Karim)');
  console.log('\n📊 Rides created:');
  console.log(`  1. ${ride1.id} - PENDING_BIDS (2 offers)`);
  console.log(`  2. ${ride2.id} - BID_ACCEPTED (needs payment)`);
  console.log(`  3. ${ride3.id} - IN_TRANSIT`);
  console.log(`  4. ${ride4.id} - DROPOFF_ARRIVED (needs customer confirmation)`);
  console.log(`  5. ${ride5.id} - COMPLETED (rated)`);
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
