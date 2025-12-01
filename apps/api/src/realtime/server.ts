/**
 * Real-Time Tracking Socket.IO Server
 *
 * Enhanced Socket.IO server with:
 * - JWT authentication
 * - Redis adapter for horizontal scaling
 * - TypeScript typed events
 * - Real-time trip tracking
 */

import { Server as HTTPServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../../../apps/web/types/realtime';
import { authenticateSocket } from './middleware';
import { setupTrackingHandlers } from './handlers';

// Redis clients for Socket.IO adapter
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

/**
 * Create and configure Socket.IO server with Redis adapter
 */
export function createRealtimeServer(
  httpServer: HTTPServer,
  redisUrl?: string
): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const REDIS_URL = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

  // Socket.IO configuration
  const options: Partial<ServerOptions> = {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    // Enable connection state recovery for resilience
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: false,
    },
  };

  // Create Socket.IO server with typed events
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, options);

  // Setup Redis adapter for horizontal scaling
  try {
    pubClient = new Redis(REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`🔄 Redis adapter reconnecting... Attempt ${times}`);
        return delay;
      },
    });

    subClient = pubClient.duplicate();

    // Setup adapter once both clients are ready
    Promise.all([
      new Promise((resolve) => pubClient!.once('ready', resolve)),
      new Promise((resolve) => subClient!.once('ready', resolve)),
    ]).then(() => {
      io.adapter(createAdapter(pubClient!, subClient!));
      console.log('✅ Socket.IO Redis adapter configured');
    });

    pubClient.on('error', (err) => {
      console.error('❌ Redis pub client error:', err);
    });

    subClient.on('error', (err) => {
      console.error('❌ Redis sub client error:', err);
    });
  } catch (error) {
    console.error('❌ Failed to setup Redis adapter:', error);
    console.warn('⚠️  Running Socket.IO without Redis adapter (single instance mode)');
  }

  // Apply JWT authentication middleware
  io.use(authenticateSocket);

  // Setup event handlers
  const redis = new Redis(REDIS_URL);

  io.on('connection', (socket) => {
    setupTrackingHandlers(io, socket, redis);
  });

  // Error handling
  io.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
  });

  console.log('🚀 Real-time tracking server initialized');
  console.log(`📡 CORS origin: ${options.cors?.origin}`);
  console.log(`🔌 Transports: ${options.transports?.join(', ')}`);

  return io;
}

/**
 * Cleanup function to close Redis connections
 */
export async function closeRealtimeServer(): Promise<void> {
  console.log('🔌 Closing real-time server...');

  if (pubClient) {
    await pubClient.quit();
    pubClient = null;
  }

  if (subClient) {
    await subClient.quit();
    subClient = null;
  }

  console.log('✅ Real-time server closed');
}

/**
 * Get statistics about connected clients
 */
export function getServerStats(io: Server): {
  totalSockets: number;
  rooms: string[];
  socketsByRoom: Record<string, number>;
} {
  const sockets = io.sockets.sockets;
  const rooms = Array.from(io.sockets.adapter.rooms.keys())
    .filter((room) => !sockets.has(room)); // Filter out socket IDs

  const socketsByRoom: Record<string, number> = {};

  for (const room of rooms) {
    const socketsInRoom = io.sockets.adapter.rooms.get(room);
    socketsByRoom[room] = socketsInRoom?.size || 0;
  }

  return {
    totalSockets: sockets.size,
    rooms,
    socketsByRoom,
  };
}

/**
 * Broadcast system message to all connected clients
 */
export function broadcastSystemMessage(
  io: Server,
  message: string,
  code?: string
): void {
  io.emit('error', { message, code: code || 'SYSTEM_MESSAGE' });
}

/**
 * Broadcast message to specific trip room
 */
export function broadcastToTrip(
  io: Server,
  rideId: string,
  event: keyof ServerToClientEvents,
  data: any
): void {
  const roomName = `trip:${rideId}`;
  io.to(roomName).emit(event, data);
}

/**
 * Check if a trip room has active listeners
 */
export function hasTripListeners(io: Server, rideId: string): boolean {
  const roomName = `trip:${rideId}`;
  const room = io.sockets.adapter.rooms.get(roomName);
  return room ? room.size > 0 : false;
}
