import { Router } from 'express';
import { prisma } from '@truck4u/database';
import { verifyToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Server } from 'socket.io';

const router = Router();

// Messages rapides prédéfinis
const QUICK_MESSAGES = {
  DRIVER: [
    "Je suis arrivé",
    "Je suis en route",
    "Je suis en retard de 10 min",
    "Veuillez m'appeler",
    "Où êtes-vous?"
  ],
  CUSTOMER: [
    "J'arrive dans 5 minutes",
    "Je suis là",
    "Pouvez-vous attendre 5 min?",
    "Merci!"
  ]
};

// GET /api/chat/:rideId/messages - Get chat history
router.get('/:rideId/messages', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const { rideId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Verify user has access to this ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { customerId: true, driverId: true }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if user is customer or driver of this ride
    const isCustomer = ride.customerId === req.userId;
    const isDriver = ride.driverId === req.userId;

    if (!isCustomer && !isDriver) {
      return res.status(403).json({ error: 'Not authorized to view this chat' });
    }

    // Get messages
    const messages = await prisma.chatMessage.findMany({
      where: { rideId },
      orderBy: { createdAt: 'asc' },
      skip: parseInt(offset as string),
      take: parseInt(limit as string)
    });

    // Mark messages as read for the current user
    const userType = isCustomer ? 'CUSTOMER' : 'DRIVER';
    await prisma.chatMessage.updateMany({
      where: {
        rideId,
        senderType: { not: userType },
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

// POST /api/chat/:rideId/message - Send a message
router.post('/:rideId/message', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const { rideId } = req.params;
    const { message, isQuickMessage = false } = z.object({
      message: z.string().min(1).max(1000),
      isQuickMessage: z.boolean().optional()
    }).parse(req.body);

    // Verify user has access to this ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } }
      }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Determine sender type
    const isCustomer = ride.customerId === req.userId;
    const isDriver = ride.driverId === req.userId;

    if (!isCustomer && !isDriver) {
      return res.status(403).json({ error: 'Not authorized to send messages in this chat' });
    }

    const senderType = isCustomer ? 'CUSTOMER' : 'DRIVER';
    const senderName = isCustomer ? ride.customer.name : ride.driver?.name || 'Conducteur';
    const recipientId = isCustomer ? ride.driverId : ride.customerId;

    // Create message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        rideId,
        senderId: req.userId!,
        senderType,
        message,
        isQuickMessage
      }
    });

    // Send real-time notification via Socket.io
    const io = req.app.get('io') as Server;
    if (io && recipientId) {
      const recipientRoom = isCustomer ? `driver:${recipientId}` : `customer:${recipientId}`;

      io.to(recipientRoom).emit('new_message', {
        messageId: chatMessage.id,
        rideId,
        senderId: req.userId,
        senderType,
        senderName,
        message,
        isQuickMessage,
        createdAt: chatMessage.createdAt
      });
    }

    res.json({
      message: chatMessage,
      sent: true
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/chat/:rideId/read - Mark all messages as read
router.patch('/:rideId/read', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const { rideId } = req.params;

    // Verify user has access to this ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { customerId: true, driverId: true }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const isCustomer = ride.customerId === req.userId;
    const isDriver = ride.driverId === req.userId;

    if (!isCustomer && !isDriver) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Mark messages from the other party as read
    const userType = isCustomer ? 'CUSTOMER' : 'DRIVER';
    await prisma.chatMessage.updateMany({
      where: {
        rideId,
        senderType: { not: userType },
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/:rideId/unread-count - Get unread message count
router.get('/:rideId/unread-count', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const { rideId } = req.params;

    // Verify user has access to this ride
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      select: { customerId: true, driverId: true }
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const isCustomer = ride.customerId === req.userId;
    const isDriver = ride.driverId === req.userId;

    if (!isCustomer && !isDriver) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Count unread messages from the other party
    const userType = isCustomer ? 'CUSTOMER' : 'DRIVER';
    const unreadCount = await prisma.chatMessage.count({
      where: {
        rideId,
        senderType: { not: userType },
        isRead: false
      }
    });

    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/quick-messages - Get quick message templates
router.get('/quick-messages', verifyToken, async (req: AuthRequest, res, next) => {
  try {
    const { userType } = req.query;

    if (userType === 'CUSTOMER' || userType === 'DRIVER') {
      res.json({ messages: QUICK_MESSAGES[userType] });
    } else {
      res.json({
        customer: QUICK_MESSAGES.CUSTOMER,
        driver: QUICK_MESSAGES.DRIVER
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
