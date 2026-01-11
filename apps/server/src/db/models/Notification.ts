import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'document_uploaded'
  | 'document_processed'
  | 'document_shared'
  | 'document_failed'
  | 'organization_invite'
  | 'organization_joined'
  | 'chat_message'
  | 'system'
  | 'info';

export interface INotification extends Document {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'document_uploaded',
        'document_processed',
        'document_shared',
        'document_failed',
        'organization_invite',
        'organization_joined',
        'chat_message',
        'system',
        'info',
      ],
      default: 'info',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
