import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { playSuccessSound, playErrorSound } from '../notification-sound';

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  unreadNotificationCount: number;
  connect: (token: string) => void;
  disconnect: () => void;
  onDocumentProcessed?: (data: {
    documentId: string;
    filename: string;
    status: 'completed' | 'failed';
    error?: string;
  }) => void;
  onChatCompleted?: (data: { chatId: string; message: string; sourcesCount: number }) => void;
  onNewNotification?: (notification: NotificationData) => void;
  setDocumentHandler: (handler?: WebSocketState['onDocumentProcessed']) => void;
  setChatHandler: (handler?: WebSocketState['onChatCompleted']) => void;
  setNotificationHandler: (handler?: WebSocketState['onNewNotification']) => void;
  setUnreadCount: (count: number) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  unreadNotificationCount: 0,
  onDocumentProcessed: undefined,
  onChatCompleted: undefined,
  onNewNotification: undefined,
  connect: (token) => {
    if (get().socket?.connected) return;

    const url =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace('/trpc', '') ||
      'http://localhost:3001';

    const socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      set({ isConnected: false });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Document processed event
    socket.on('document:processed', (data) => {
      console.log('📄 Document processed:', data);

      if (data.status === 'completed') {
        playSuccessSound();

        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Document Ready', {
            body: `${data.filename} has been processed successfully!`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
          });
        }
      } else {
        playErrorSound();

        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Processing Failed', {
            body: `Failed to process ${data.filename}: ${data.error || 'Unknown error'}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
          });
        }
      }

      get().onDocumentProcessed?.(data);
    });

    // Chat completed event
    socket.on('chat:completed', (data) => {
      console.log('💬 Chat completed:', data);

      playSuccessSound();

      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
        new Notification('RAG Search Complete', {
          body: `Found ${data.sourcesCount} relevant sources. Response ready!`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }

      get().onChatCompleted?.(data);
    });

    // New notification event
    socket.on('notification:new', (notification: NotificationData) => {
      console.log('🔔 New notification:', notification);

      playSuccessSound();

      // Show browser notification
      if (typeof window !== 'undefined' && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }

      get().onNewNotification?.(notification);
    });

    // Notification count update event
    socket.on('notification:count', (data: { unreadCount: number }) => {
      console.log('🔔 Notification count:', data.unreadCount);
      set({ unreadNotificationCount: data.unreadCount });
    });

    // Notification read event
    socket.on('notification:read', (data: { notificationId: string }) => {
      console.log('🔔 Notification read:', data.notificationId);
    });

    set({ socket });
  },
  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false, unreadNotificationCount: 0 });
  },
  setDocumentHandler: (handler) => set({ onDocumentProcessed: handler }),
  setChatHandler: (handler) => set({ onChatCompleted: handler }),
  setNotificationHandler: (handler) => set({ onNewNotification: handler }),
  setUnreadCount: (count) => set({ unreadNotificationCount: count }),
}));
