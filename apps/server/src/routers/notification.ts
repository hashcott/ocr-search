import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { Notification, NotificationType } from '../db/models/Notification';
import { TRPCError } from '@trpc/server';
import { emitNotification, emitNotificationCountUpdate } from '../services/websocket';

// Input schemas
const getNotificationsSchema = z.object({
  limit: z.number().min(1).max(50).default(5),
  offset: z.number().min(0).default(0),
  unreadOnly: z.boolean().default(false),
});

const markAsReadSchema = z.object({
  notificationId: z.string(),
});

const markMultipleAsReadSchema = z.object({
  notificationIds: z.array(z.string()),
});

const createNotificationSchema = z.object({
  type: z.enum([
    'document_uploaded',
    'document_processed',
    'document_shared',
    'document_failed',
    'organization_invite',
    'organization_joined',
    'chat_message',
    'system',
    'info',
  ] as const),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  link: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const notificationRouter = router({
  // Get notifications for the current user
  getNotifications: protectedProcedure
    .input(getNotificationsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, offset, unreadOnly } = input;

      const query: { userId: string; isRead?: boolean } = { userId: ctx.userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
        Notification.countDocuments(query),
        Notification.countDocuments({ userId: ctx.userId, isRead: false }),
      ]);

      return {
        notifications: notifications.map((n) => ({
          id: n._id.toString(),
          type: n.type as NotificationType,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          link: n.link,
          metadata: n.metadata,
          createdAt: n.createdAt.toISOString(),
        })),
        total,
        unreadCount,
        hasMore: offset + notifications.length < total,
      };
    }),

  // Get recent notifications (for header dropdown)
  getRecentNotifications: protectedProcedure.query(async ({ ctx }) => {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: ctx.userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Notification.countDocuments({ userId: ctx.userId, isRead: false }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        link: n.link,
        metadata: n.metadata,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  }),

  // Get unread count only
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await Notification.countDocuments({ userId: ctx.userId, isRead: false });
    return { count };
  }),

  // Mark a notification as read
  markAsRead: protectedProcedure.input(markAsReadSchema).mutation(async ({ ctx, input }) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: input.notificationId, userId: ctx.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Notification not found',
      });
    }

    return { success: true };
  }),

  // Mark a notification as unread
  markAsUnread: protectedProcedure.input(markAsReadSchema).mutation(async ({ ctx, input }) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: input.notificationId, userId: ctx.userId },
      { isRead: false },
      { new: true }
    );

    if (!notification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Notification not found',
      });
    }

    return { success: true };
  }),

  // Toggle read status
  toggleReadStatus: protectedProcedure.input(markAsReadSchema).mutation(async ({ ctx, input }) => {
    const notification = await Notification.findOne({
      _id: input.notificationId,
      userId: ctx.userId,
    });

    if (!notification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Notification not found',
      });
    }

    notification.isRead = !notification.isRead;
    await notification.save();

    return { success: true, isRead: notification.isRead };
  }),

  // Mark multiple notifications as read
  markMultipleAsRead: protectedProcedure
    .input(markMultipleAsReadSchema)
    .mutation(async ({ ctx, input }) => {
      await Notification.updateMany(
        { _id: { $in: input.notificationIds }, userId: ctx.userId },
        { isRead: true }
      );

      return { success: true };
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await Notification.updateMany({ userId: ctx.userId, isRead: false }, { isRead: true });

    return { success: true };
  }),

  // Delete a notification
  delete: protectedProcedure.input(markAsReadSchema).mutation(async ({ ctx, input }) => {
    const result = await Notification.deleteOne({
      _id: input.notificationId,
      userId: ctx.userId,
    });

    if (result.deletedCount === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Notification not found',
      });
    }

    return { success: true };
  }),

  // Delete all read notifications
  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await Notification.deleteMany({ userId: ctx.userId, isRead: true });

    return { success: true, deletedCount: result.deletedCount };
  }),

  // Create a notification (for internal use or admin)
  create: protectedProcedure.input(createNotificationSchema).mutation(async ({ ctx, input }) => {
    const notification = await Notification.create({
      userId: ctx.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      metadata: input.metadata,
    });

    return {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    };
  }),
});

// Helper function to create notifications (for use in other services)
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  options?: { link?: string; metadata?: Record<string, unknown> }
) {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    link: options?.link,
    metadata: options?.metadata,
  });

  // Emit via WebSocket for real-time updates
  emitNotification(userId, {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: notification.isRead,
    link: notification.link,
    createdAt: notification.createdAt.toISOString(),
  });

  // Also emit updated unread count
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });
  emitNotificationCountUpdate(userId, unreadCount);

  return notification;
}
