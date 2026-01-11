'use client';

import * as React from 'react';
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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './dropdown-menu';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useWebSocketStore } from '@/lib/stores/websocket-store';

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
      return <FileText className="text-primary h-4 w-4" />;
    case 'document_shared':
      return <Share2 className="text-chart-2 h-4 w-4" />;
    case 'document_failed':
      return <AlertCircle className="text-destructive h-4 w-4" />;
    case 'organization_invite':
    case 'organization_joined':
      return <Building2 className="text-chart-3 h-4 w-4" />;
    case 'chat_message':
      return <MessageSquare className="text-chart-4 h-4 w-4" />;
    case 'system':
      return <AlertCircle className="text-chart-5 h-4 w-4" />;
    default:
      return <Info className="text-muted-foreground h-4 w-4" />;
  }
}

// Single notification item component
function NotificationItem({
  notification,
  onToggleRead,
}: {
  notification: Notification;
  onToggleRead: (id: string, isRead: boolean) => void;
}) {
  const content = (
    <div
      className={cn(
        'hover:bg-accent hover:border-border group relative mx-2 my-1 flex gap-3 rounded-lg border border-transparent px-3 py-3 transition-all',
        !notification.isRead && 'bg-primary/5 border-primary/10'
      )}
    >
      {/* Icon */}
      <div className="bg-accent mt-0.5 flex-shrink-0 rounded-md p-1.5">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pr-6">
        <p
          className={cn(
            'text-sm font-medium leading-tight',
            !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {notification.title}
        </p>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
          {notification.message}
        </p>
        <p className="text-muted-foreground/60 mt-1.5 text-[10px]">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Read/Unread indicator & action */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleRead(notification.id, notification.isRead);
        }}
        className="hover:bg-background absolute right-3 top-3 flex-shrink-0 rounded-full p-1.5 opacity-0 transition-all group-hover:opacity-100"
        title={notification.isRead ? 'Mark as unread' : 'Mark as read'}
      >
        {notification.isRead ? (
          <Circle className="text-muted-foreground hover:text-foreground h-3 w-3" />
        ) : (
          <Check className="text-primary hover:text-primary/80 h-3 w-3" />
        )}
      </button>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="bg-primary absolute right-3 top-3 h-2 w-2 rounded-full group-hover:hidden" />
      )}
    </div>
  );

  if (notification.link) {
    return <Link href={notification.link}>{content}</Link>;
  }

  return content;
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const utils = trpc.useUtils();
  const { setNotificationHandler } = useWebSocketStore();

  // Fetch recent notifications
  const { data, isLoading } = trpc.notification.getRecentNotifications.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Listen for real-time notifications via WebSocket
  React.useEffect(() => {
    setNotificationHandler(() => {
      // When a new notification arrives, invalidate the query to refetch
      utils.notification.getRecentNotifications.invalidate();
      utils.notification.getUnreadCount.invalidate();
    });

    return () => {
      setNotificationHandler(undefined);
    };
  }, [setNotificationHandler, utils]);

  // Toggle read status mutation
  const toggleReadMutation = trpc.notification.toggleReadStatus.useMutation({
    onSuccess: () => {
      utils.notification.getRecentNotifications.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getRecentNotifications.invalidate();
      utils.notification.getUnreadCount.invalidate();
    },
  });

  const handleToggleRead = (id: string, _isRead: boolean) => {
    toggleReadMutation.mutate({ notificationId: id });
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-accent text-muted-foreground hover:text-foreground relative h-9 w-9 rounded-lg transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="border-border bg-card w-80 rounded-xl p-0 shadow-lg"
        sideOffset={8}
      >
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
              disabled={markAllReadMutation.isPending}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications list */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-accent rounded-full p-3">
                <Bell className="text-muted-foreground/40 h-6 w-6" />
              </div>
              <p className="text-muted-foreground mt-3 text-sm font-medium">No notifications</p>
              <p className="text-muted-foreground/60 mt-1 text-xs">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onToggleRead={handleToggleRead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="m-0" />
            <div className="p-2">
              <Link href="/dashboard/notifications" onClick={() => setIsOpen(false)}>
                <Button
                  variant="ghost"
                  className="text-primary hover:text-primary/80 hover:bg-primary/5 w-full justify-center text-sm font-medium"
                >
                  View all notifications
                </Button>
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
