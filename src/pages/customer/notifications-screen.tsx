import { useState } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { Bell, Mail, Trash2, CheckCheck, AlertCircle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { type Profile } from '@/lib/supabase';
import { useNotifications } from '@/hooks/use-notifications';

export function NotificationsScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(profile?.id || null);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order': return <AlertCircle className="w-5 h-5" />;
      case 'booking': return <Bell className="w-5 h-5" />;
      case 'promotion': return <Mail className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order': return 'bg-orange-100 text-orange-600';
      case 'booking': return 'bg-blue-100 text-blue-600';
      case 'promotion': return 'bg-green-100 text-green-600';
      case 'system': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader 
        title="Notifications" 
        actions={
          unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <p className="text-sm font-bold text-foreground">{unreadCount} unread</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 bg-surface rounded-2xl border border-dashed">
            <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm font-medium text-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification: any) => (
              <Card 
                key={notification.id} 
                className={`overflow-hidden transition-all ${!notification.is_read ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <CardBody className="p-0">
                  <div className="flex">
                    {/* Icon Section */}
                    <div className={`w-16 flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground text-sm mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-2">
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-divider">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                        <Badge variant="info" size="sm">
                          {notification.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
