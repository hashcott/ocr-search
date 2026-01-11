'use client';

import { useState } from 'react';
import {
  Bell,
  FileText,
  Share2,
  AlertCircle,
  Building2,
  MessageSquare,
  Info,
  Check,
  Circle,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

type NotificationType =
  | 'document_uploaded'
  | 'document_processed'
  | 'document_shared'
  | 'document_failed'
  | 'organization_invite'
  | 'organization_joined'
  | 'chat_message'
  | 'system'
  | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// Get icon for notification type
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'document_uploaded':
    case 'document_processed':
      return <FileText className="text-primary h-5 w-5" />;
    case 'document_shared':
      return <Share2 className="text-chart-2 h-5 w-5" />;
    case 'document_failed':
      return <AlertCircle className="text-destructive h-5 w-5" />;
    case 'organization_invite':
    case 'organization_joined':
      return <Building2 className="text-chart-3 h-5 w-5" />;
    case 'chat_message':
      return <MessageSquare className="text-chart-4 h-5 w-5" />;
    case 'system':
      return <AlertCircle className="text-chart-5 h-5 w-5" />;
    default:
      return <Info className="text-muted-foreground h-5 w-5" />;
  }
}

// Single notification item component
function NotificationItem({
  notification,
  onToggleRead,
  onDelete,
}: {
  notification: Notification;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const content = (
    <div
      className={cn(
        'bg-card hover:border-primary/30 group relative flex gap-4 rounded-xl border p-5 transition-all hover:shadow-lg',
        !notification.isRead
          ? 'border-primary/30 from-primary/5 bg-gradient-to-r to-transparent shadow-sm'
          : 'border-border'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mt-0.5 flex-shrink-0 rounded-xl p-3',
          !notification.isRead ? 'bg-primary/10' : 'bg-accent'
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  'text-base font-semibold',
                  !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {notification.title}
              </p>
              {!notification.isRead && (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  New
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              {notification.message}
            </p>
          </div>
          <span className="text-muted-foreground/70 flex-shrink-0 whitespace-nowrap text-xs">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>

        {/* Actions */}
        <div className="border-border/50 mt-4 flex items-center gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleRead(notification.id);
            }}
            className="h-8 gap-1.5 text-xs"
          >
            {notification.isRead ? (
              <>
                <Circle className="h-3.5 w-3.5" />
                Mark unread
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Mark read
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 h-8 gap-1.5 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );

  if (notification.link) {
    return <Link href={notification.link}>{content}</Link>;
  }

  return content;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(0);
  const limit = 10;

  const utils = trpc.useUtils();

  // Fetch notifications with pagination
  const { data, isLoading } = trpc.notification.getNotifications.useQuery({
    limit,
    offset: page * limit,
    unreadOnly: filter === 'unread',
  });

  // Toggle read status mutation
  const toggleReadMutation = trpc.notification.toggleReadStatus.useMutation({
    onSuccess: () => {
      utils.notification.getNotifications.invalidate();
      utils.notification.getRecentNotifications.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  // Delete notification mutation
  const deleteMutation = trpc.notification.delete.useMutation({
    onSuccess: () => {
      utils.notification.getNotifications.invalidate();
      utils.notification.getRecentNotifications.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getNotifications.invalidate();
      utils.notification.getRecentNotifications.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  // Delete all read mutation
  const deleteAllReadMutation = trpc.notification.deleteAllRead.useMutation({
    onSuccess: () => {
      utils.notification.getNotifications.invalidate();
      utils.notification.getRecentNotifications.invalidate();
    },
  });

  const handleToggleRead = (id: string) => {
    toggleReadMutation.mutate({ notificationId: id });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ notificationId: id });
  };

  const notifications = data?.notifications || [];
  const total = data?.total || 0;
  const unreadCount = data?.unreadCount || 0;
  const hasMore = data?.hasMore || false;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="from-primary/20 to-primary/5 rounded-2xl bg-gradient-to-br p-4 shadow-sm">
              <Bell className="text-primary h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
              <p className="text-muted-foreground mt-1">
                Stay updated with your document activities and team updates
              </p>
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Filter tabs */}
          <div className="bg-accent flex rounded-lg p-1">
            <button
              onClick={() => {
                setFilter('all');
                setPage(0);
              }}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                filter === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All ({total})
            </button>
            <button
              onClick={() => {
                setFilter('unread');
                setPage(0);
              }}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                filter === 'unread'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="gap-1.5"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteAllReadMutation.mutate()}
              disabled={deleteAllReadMutation.isPending}
              className="text-destructive hover:text-destructive gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Clear read
            </Button>
          </div>
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20 text-center">
            <div className="bg-accent rounded-full p-5">
              <Bell className="text-muted-foreground/40 h-10 w-10" />
            </div>
            <h3 className="mt-5 text-lg font-semibold">No notifications</h3>
            <p className="text-muted-foreground mt-2 max-w-[240px] text-sm">
              {filter === 'unread'
                ? "You've read all your notifications! Great job staying on top of things."
                : "You don't have any notifications yet. Check back later!"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notifications.map((notification) => (
              <div key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onToggleRead={handleToggleRead}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-muted-foreground px-4 text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
