import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt';

let io: SocketIOServer | null = null;

export function initializeWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      (socket as unknown as { userId: string }).userId = decoded.userId;
      next();
    } catch (_err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as unknown as { userId: string }).userId;
    console.log(`🔌 WebSocket connected: User ${userId}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket disconnected: User ${userId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocket first.');
  }
  return io;
}

// Helper functions to emit notifications
export function emitDocumentProcessed(
  userId: string,
  data: {
    documentId: string;
    filename: string;
    status: 'completed' | 'failed';
    error?: string;
  }
) {
  const socketIO = getIO();
  socketIO.to(`user:${userId}`).emit('document:processed', data);
}

export function emitChatCompleted(
  userId: string,
  data: {
    chatId: string;
    message: string;
    sourcesCount: number;
  }
) {
  const socketIO = getIO();
  socketIO.to(`user:${userId}`).emit('chat:completed', data);
}

// Notification events
export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export function emitNotification(userId: string, notification: NotificationData) {
  try {
    const socketIO = getIO();
    socketIO.to(`user:${userId}`).emit('notification:new', notification);
  } catch (error) {
    // WebSocket not initialized yet, skip
    console.warn('WebSocket not ready for notification emit');
  }
}

export function emitNotificationRead(userId: string, notificationId: string) {
  try {
    const socketIO = getIO();
    socketIO.to(`user:${userId}`).emit('notification:read', { notificationId });
  } catch (error) {
    console.warn('WebSocket not ready for notification read emit');
  }
}

export function emitNotificationCountUpdate(userId: string, unreadCount: number) {
  try {
    const socketIO = getIO();
    socketIO.to(`user:${userId}`).emit('notification:count', { unreadCount });
  } catch (error) {
    console.warn('WebSocket not ready for notification count emit');
  }
}
