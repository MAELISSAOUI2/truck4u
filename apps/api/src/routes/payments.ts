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

// Helper: Calculate platform fee
function calculatePlatformFee(amount: number, isB2BCustomer: boolean): number {
  const commission = isB2BCustomer ? 0.08 : 0.15;
  return Math.round(amount * commission * 100) / 100;
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
    const driverAmount = ride.finalPrice - platformFee;

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
              totalAmount: ride.finalPrice,
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
          amount: ride.finalPrice,
          message: 'Le client a choisi le paiement en espèces. Vous pouvez démarrer la course.'
        });
      }

      return res.json({
        paymentId: payment.id,
        method: 'CASH',
        totalAmount: ride.finalPrice,
        message: 'Please pay cash to driver. Driver will confirm receipt.'
      });
    }

    if (method === 'CARD') {
      // Paymee integration
      const paymeeResponse = await axios.post(
        `${process.env.PAYMEE_API_URL}/payments`,
        {
          amount: ride.finalPrice * 1000, // Convert to millimes
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
              totalAmount: ride.finalPrice,
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
          amount: ride.finalPrice,
          message: 'Le client a initié le paiement par carte. Vous pouvez démarrer la course.'
        });
      }

      return res.json({
        paymentId: payment.id,
        method: 'CARD',
        paymentUrl: paymeeResponse.data.payment_url,
        totalAmount: ride.finalPrice
      });
    }

    if (method === 'FLOUCI') {
      // Flouci integration
      const flouciResponse = await axios.post(
        `${process.env.FLOUCI_API_URL}/api/payment`,
        {
          amount: ride.finalPrice,
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
              totalAmount: ride.finalPrice,
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
          amount: ride.finalPrice,
          message: 'Le client a initié le paiement avec Flouci. Vous pouvez démarrer la course.'
        });
      }

      return res.json({
        paymentId: payment.id,
        method: 'FLOUCI',
        paymentUrl: flouciResponse.data.result.link,
        totalAmount: ride.finalPrice
      });
    }

    res.status(400).json({ error: 'Invalid payment method' });
  } catch (error) {
    console.error('Payment initiation error:', error);
    next(error);
  }
});

// POST /api/payments/:id/confirm-cash - Driver confirms cash receipt
router.post('/:id/confirm-cash', verifyToken, requireDriver, async (req: AuthRequest, res, next) => {
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

    if (payment.method !== 'CASH') {
      return res.status(400).json({ error: 'Not a cash payment' });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Record driver earnings
    await prisma.driverEarnings.create({
      data: {
        driverId: req.userId!,
        rideId: payment.rideId,
        grossAmount: payment.totalAmount,
        platformFee: payment.platformFee,
        netEarnings: payment.driverAmount
      }
    });

    // Update driver total earnings
    await prisma.driver.update({
      where: { id: req.userId },
      data: {
        totalEarnings: {
          increment: payment.driverAmount
        },
        totalRides: {
          increment: 1
        }
      }
    });

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
