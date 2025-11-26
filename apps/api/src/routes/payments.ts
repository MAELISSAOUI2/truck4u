import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, requireCustomer, requireDriver, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import axios from 'axios';
import type { Server } from 'socket.io';

const router = Router();

const initiatePaymentSchema = z.object({
  rideId: z.string(),
  method: z.enum(['CASH', 'CARD', 'FLOUCI'])
});

// Helper: Calculate platform fee (FIXED 20 DT)
function calculatePlatformFee(amount: number, isB2BCustomer: boolean): number {
  // Platform fee is fixed at 20 DT regardless of ride amount or customer type
  return 20.0;
}

// POST /api/payments/initiate - Initiate payment (can be done at BID_ACCEPTED or COMPLETED)
router.post('/initiate', verifyToken, requireCustomer, async (req: AuthRequest, res, next) => {
  try {
    const { rideId, method } = initiatePaymentSchema.parse(req.body);

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: true,
        driver: true,
        payment: true
      }
    });

    if (!ride || ride.customerId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Allow payment at BID_ACCEPTED or later stages
    if (!['BID_ACCEPTED', 'DRIVER_ARRIVING', 'PICKUP_ARRIVED', 'LOADING', 'IN_TRANSIT', 'DROPOFF_ARRIVED', 'COMPLETED'].includes(ride.status)) {
      return res.status(400).json({ error: 'Cannot process payment at this stage' });
    }

    if (!ride.finalPrice) {
      return res.status(400).json({ error: 'Final price not set' });
    }

    // Check for existing payment
    const existingPayment = ride.payment;

    if (existingPayment && existingPayment.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Payment already completed' });
    }

    const platformFee = calculatePlatformFee(ride.finalPrice, ride.customer.isB2BSubscriber);
    const driverAmount = ride.finalPrice; // Driver gets the full bid price
    const totalAmount = driverAmount + platformFee; // Customer pays driver price + platform fee

    if (method === 'CASH') {
      // Update or create payment record for cash
      const payment = existingPayment
        ? await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { method: 'CASH' }
          })
        : await prisma.payment.create({
            data: {
              rideId,
              method: 'CASH',
              totalAmount,
              platformFee,
              driverAmount,
              status: 'PENDING'
            }
          });

      // Notify driver that payment method has been selected
      const io = req.app.get('io') as Server;
      if (ride.driverId) {
        io.to(`driver:${ride.driverId}`).emit('payment_confirmed', {
          rideId,
          method: 'CASH',
          amount: totalAmount,
          message: 'Le client a choisi le paiement en espèces. Vous pouvez démarrer la course.'
        });
      }

      return res.json({
        paymentId: payment.id,
        method: 'CASH',
        driverPrice: driverAmount,
        platformFee: platformFee,
        totalAmount: totalAmount,
        message: 'Please pay cash to driver. Driver will confirm receipt.'
      });
    }

    if (method === 'CARD') {
      // Paymee integration
      const paymeeResponse = await axios.post(
        `${process.env.PAYMEE_API_URL}/payments`,
        {
          amount: totalAmount * 1000, // Convert to millimes (total = driver price + 20 DT)
          note: `Truck4u Ride #${rideId.substring(0, 8)}`,
          first_name: ride.customer.name.split(' ')[0],
          last_name: ride.customer.name.split(' ')[1] || '',
          phone: ride.customer.phone,
          email: ride.customer.email || '',
          return_url: `${process.env.FRONTEND_URL}/customer/rides/${rideId}`,
          cancel_url: `${process.env.FRONTEND_URL}/customer/rides/${rideId}`,
          webhook_url: `${process.env.API_URL}/webhooks/paymee`
        },
        {
          headers: {
            Authorization: `Token ${process.env.PAYMEE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const payment = existingPayment
        ? await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              method: 'CARD',
              transactionRef: paymeeResponse.data.payment_token,
              metadata: {
                paymee_payment_url: paymeeResponse.data.payment_url
              }
            }
          })
        : await prisma.payment.create({
            data: {
              rideId,
              method: 'CARD',
              totalAmount,
              platformFee,
              driverAmount,
              status: 'PENDING',
              transactionRef: paymeeResponse.data.payment_token,
              metadata: {
                paymee_payment_url: paymeeResponse.data.payment_url
              }
            }
          });

      // Notify driver that payment method has been selected
      const io = req.app.get('io') as Server;
      if (ride.driverId) {
        io.to(`driver:${ride.driverId}`).emit('payment_confirmed', {
          rideId,
          method: 'CARD',
          amount: totalAmount,
          message: 'Le client a initié le paiement par carte. Vous pouvez démarrer la course.'
        });
      }

      return res.json({
        paymentId: payment.id,
        method: 'CARD',
        paymentUrl: paymeeResponse.data.payment_url,
        driverPrice: driverAmount,
        platformFee: platformFee,
        totalAmount: totalAmount
      });
    }

    if (method === 'FLOUCI') {
      // Flouci integration
      const flouciResponse = await axios.post(
        `${process.env.FLOUCI_API_URL}/api/payment`,
        {
          amount: totalAmount,
          description: `Truck4u Ride #${rideId.substring(0, 8)}`,
          accept_url: `${process.env.FRONTEND_URL}/customer/rides/${rideId}`,
          cancel_url: `${process.env.FRONTEND_URL}/customer/rides/${rideId}`,
          webhook_url: `${process.env.API_URL}/webhooks/flouci`,
          developer_tracking_id: rideId
        },
        {
          headers: {
            'apppublic': process.env.FLOUCI_APP_PUBLIC!,
            'appsecret': process.env.FLOUCI_APP_SECRET!
          }
        }
      );

      const payment = existingPayment
        ? await prisma.payment.update({
            where: { id: existingPayment.id },
            data: {
              method: 'FLOUCI',
              transactionRef: flouciResponse.data.result.payment_id,
              metadata: {
                flouci_payment_url: flouciResponse.data.result.link
              }
            }
          })
        : await prisma.payment.create({
            data: {
              rideId,
              method: 'FLOUCI',
              totalAmount,
              platformFee,
              driverAmount,
              status: 'PENDING',
              transactionRef: flouciResponse.data.result.payment_id,
              metadata: {
                flouci_payment_url: flouciResponse.data.result.link
              }
            }
          });

      // Notify driver that payment method has been selected
      const io = req.app.get('io') as Server;
      if (ride.driverId) {
        io.to(`driver:${ride.driverId}`).emit('payment_confirmed', {
          rideId,
          method: 'FLOUCI',
          amount: totalAmount,
          message: 'Le client a initié le paiement avec Flouci. Vous pouvez démarrer la course.'
        });
      }

      return res.json({
        paymentId: payment.id,
        method: 'FLOUCI',
        paymentUrl: flouciResponse.data.result.link,
        driverPrice: driverAmount,
        platformFee: platformFee,
        totalAmount: totalAmount
      });
    }

    res.status(400).json({ error: 'Invalid payment method' });
  } catch (error) {
    console.error('Payment initiation error:', error);
    next(error);
  }
});

// POST /api/payments/:id/hold - Mettre le paiement en attente (quand conducteur arrive)
router.post('/:id/hold', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        ride: true
      }
    });

    if (!payment || payment.ride.driverId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Payment is not pending' });
    }

    // Mettre en ON_HOLD quand le conducteur arrive à destination
    await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'ON_HOLD',
        onHoldAt: new Date()
      }
    });

    // Notifier le client
    const io = req.app.get('io') as Server;
    if (payment.ride.customerId) {
      io.to(`customer:${payment.ride.customerId}`).emit('payment_on_hold', {
        rideId: payment.rideId,
        paymentId: payment.id,
        message: 'Le conducteur est arrivé. Veuillez confirmer la livraison.'
      });
    }

    res.json({ message: 'Payment on hold, waiting for confirmation' });
  } catch (error) {
    next(error);
  }
});

// POST /api/payments/:id/confirm-cash - Customer confirms delivery (or driver can confirm)
router.post('/:id/confirm-cash', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        ride: true
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Autoriser le client ou le conducteur à confirmer
    const isCustomer = payment.ride.customerId === req.userId;
    const isDriver = payment.ride.driverId === req.userId;

    if (!isCustomer && !isDriver) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (payment.method !== 'CASH') {
      return res.status(400).json({ error: 'Not a cash payment' });
    }

    // Si le paiement est encore PENDING, le mettre directement en COMPLETED (ancien flow)
    // Si ON_HOLD, confirmer et compléter
    if (payment.status !== 'PENDING' && payment.status !== 'ON_HOLD') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    // Update payment status
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: req.params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Vérifier si les gains n'ont pas déjà été enregistrés
      const existingEarnings = await tx.driverEarnings.findFirst({
        where: { rideId: payment.rideId }
      });

      if (!existingEarnings && payment.ride.driverId) {
        // Record driver earnings
        await tx.driverEarnings.create({
          data: {
            driverId: payment.ride.driverId,
            rideId: payment.rideId,
            grossAmount: payment.totalAmount,
            platformFee: payment.platformFee,
            netEarnings: payment.driverAmount
          }
        });

        // Update driver total earnings
        await tx.driver.update({
          where: { id: payment.ride.driverId },
          data: {
            totalEarnings: {
              increment: payment.driverAmount
            },
            totalRides: {
              increment: 1
            }
          }
        });
      }
    });

    // Notifier les deux parties
    const io = req.app.get('io') as Server;
    if (payment.ride.customerId) {
      io.to(`customer:${payment.ride.customerId}`).emit('payment_confirmed', {
        rideId: payment.rideId,
        paymentId: payment.id,
        message: 'Paiement confirmé avec succès'
      });
    }
    if (payment.ride.driverId) {
      io.to(`driver:${payment.ride.driverId}`).emit('payment_confirmed', {
        rideId: payment.rideId,
        paymentId: payment.id,
        amount: payment.driverAmount,
        message: 'Paiement confirmé, gains enregistrés'
      });
    }

    res.json({ message: 'Cash payment confirmed' });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/:rideId - Get payment status
router.get('/:rideId', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { rideId: req.params.rideId },
      include: {
        ride: {
          select: {
            customerId: true,
            driverId: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check authorization
    if (payment.ride.customerId !== req.userId && payment.ride.driverId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
});

export default router;
