import { createCaller, createAuthenticatedContext } from '../helpers';
import { Notification } from '../../src/db/models/Notification';
import * as websocketService from '../../src/services/websocket';
import mongoose from 'mongoose';

// Mock services
jest.mock('../../src/services/websocket');

describe('Notification Router Integration', () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Create some notifications
    await Notification.create({
      userId,
      type: 'info',
      title: 'Notification 1',
      message: 'Message 1',
      isRead: false,
    });

    await Notification.create({
      userId,
      type: 'info',
      title: 'Notification 2',
      message: 'Message 2',
      isRead: true,
    });
  });

  it('should get notifications', async () => {
    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const result = await caller.notification.getNotifications({});

    expect(result.notifications).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.unreadCount).toBe(1);
  });

  it('should get unread count', async () => {
    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    const result = await caller.notification.getUnreadCount();

    expect(result.count).toBe(1);
  });

  it('should mark all as read', async () => {
    const ctx = createAuthenticatedContext(userId);
    const caller = createCaller(ctx);

    await caller.notification.markAllAsRead();

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    expect(unreadCount).toBe(0);
  });
});
