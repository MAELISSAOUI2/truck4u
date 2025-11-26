import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket';
import { initNotificationService } from './services/notifications';
import { startAutoConfirmationBatch } from './services/paymentAutoConfirmation';
import { startSubscriptionExpirationBatch } from './services/subscriptionExpiration';
import authRoutes from './routes/auth';
import driverRoutes from './routes/drivers';
import customerRoutes from './routes/customers';
import rideRoutes from './routes/rides';
import paymentRoutes from './routes/payments';
import cancellationRoutes from './routes/cancellations';
import subscriptionRoutes from './routes/subscriptions';
import driverSubscriptionRoutes from './routes/driverSubscriptions';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';
import kycRoutes from './routes/kyc';
import chatRoutes from './routes/chat';
import pricingRoutes from './routes/pricing';
import { errorHandler } from './middleware/error';
import { rateLimiter } from './middleware/rateLimit';
import path from 'path';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Make io accessible to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/driver-subscriptions', driverSubscriptionRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/webhooks', webhookRoutes);

// Error handling
app.use(errorHandler);

// Initialize notification service
initNotificationService(io);

// Setup Socket.io handlers
setupSocketHandlers(io);

// Start payment auto-confirmation batch job
const stopPaymentBatchJob = startAutoConfirmationBatch(io);

// Start subscription expiration batch job
const stopSubscriptionBatchJob = startSubscriptionExpirationBatch(io);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  stopPaymentBatchJob();
  stopSubscriptionBatchJob();
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`⏰ Payment auto-confirmation batch job started`);
  console.log(`💎 Subscription expiration batch job started`);
});

export { io };
