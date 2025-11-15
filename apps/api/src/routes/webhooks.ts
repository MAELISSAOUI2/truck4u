import { Router, Request, Response } from 'express';
import { prisma } from '@truck4u/database';
import crypto from 'crypto';

const router = Router();

// POST /webhooks/paymee - Paymee payment webhook
router.post('/paymee', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-paymee-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PAYMEE_WEBHOOK_SECRET || '')
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid Paymee webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { payment_token, status } = req.body;

    // Find payment by transaction ref
    const payment = await prisma.payment.findFirst({
      where: {
        transactionRef: payment_token,
        method: 'CARD'
      },
      include: {
        ride: true
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (status === 'success') {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Record driver earnings
      if (payment.ride.driverId) {
        await prisma.driverEarnings.create({
          data: {
            driverId: payment.ride.driverId,
            rideId: payment.rideId,
            grossAmount: payment.totalAmount,
            platformFee: payment.platformFee,
            netEarnings: payment.driverAmount
          }
        });

        // Update driver stats
        await prisma.driver.update({
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

      console.log(`Payment ${payment.id} completed via Paymee`);
    } else if (status === 'failed') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Paymee webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /webhooks/flouci - Flouci payment webhook
router.post('/flouci', async (req: Request, res: Response) => {
  try {
    // Flouci signature verification
    const token = req.headers['appprivate'] as string;
    
    if (token !== process.env.FLOUCI_APP_SECRET) {
      console.error('Invalid Flouci webhook token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { transaction_id, status, developer_tracking_id } = req.body;

    // Find payment by transaction ref
    const payment = await prisma.payment.findFirst({
      where: {
        transactionRef: transaction_id,
        method: 'FLOUCI'
      },
      include: {
        ride: true
      }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (status === 'SUCCESS') {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      // Record driver earnings
      if (payment.ride.driverId) {
        await prisma.driverEarnings.create({
          data: {
            driverId: payment.ride.driverId,
            rideId: payment.rideId,
            grossAmount: payment.totalAmount,
            platformFee: payment.platformFee,
            netEarnings: payment.driverAmount
          }
        });

        // Update driver stats
        await prisma.driver.update({
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

      console.log(`Payment ${payment.id} completed via Flouci`);
    } else if (status === 'FAILED') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Flouci webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
