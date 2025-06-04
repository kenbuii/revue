# 🔔 Phase 1: Notifications System Setup Guide

## Overview
Phase 1 establishes the core notifications infrastructure including database schema, service layer, React context, and updated UI. This provides the foundation for real-time notifications and user interaction tracking.

---

## 🗄️ Step 1: Database Setup

### 1.1 Run the Notifications Schema Migration
```bash
# Connect to your Supabase project and run the schema file
psql -h your-supabase-host -U postgres -d postgres -f supabase/phase1_notifications_schema.sql
```

Or run it in the Supabase Dashboard SQL Editor:
- Copy contents of `supabase/phase1_notifications_schema.sql`
- Paste into SQL Editor and execute

### 1.2 Verify Tables Created
Run this query to confirm all tables exist:
```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notifications', 'notification_preferences', 'push_notification_tokens');
```

Should return 3 tables.

### 1.3 Verify Functions Created
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%';
```

Should return multiple functions including:
- `create_notification`
- `mark_notifications_read`
- `get_user_notifications`
- `get_unread_notification_count`

---

## 📱 Step 2: Frontend Integration

### 2.1 Add NotificationsProvider to App Layout
In your root layout file (likely `app/_layout.tsx`), wrap your app with the NotificationsProvider:

```typescript
import { NotificationsProvider } from '@/contexts/NotificationsContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        {/* Your existing providers and components */}
        <UserProfileProvider>
          <BookmarksProvider>
            <FavoritesProvider>
              {/* App content */}
            </FavoritesProvider>
          </BookmarksProvider>
        </UserProfileProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
}
```

### 2.2 Update Tab Layout for Notification Badge
In `app/(tabs)/_layout.tsx`, add notification badge to the notifications tab:

```typescript
import { useUnreadNotificationsCount } from '@/contexts/NotificationsContext';

function NotificationTabIcon({ color, focused }: any) {
  const unreadCount = useUnreadNotificationsCount();
  
  return (
    <View style={{ position: 'relative' }}>
      <Ionicons 
        name={focused ? 'notifications' : 'notifications-outline'} 
        size={24} 
        color={color} 
      />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -6,
          right: -6,
          backgroundColor: '#FF3B30',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

// In your tab definition:
<Tabs.Screen
  name="notifications"
  options={{
    title: 'Notifications',
    tabBarIcon: NotificationTabIcon,
  }}
/>
```

---

## 🧪 Step 3: Testing the Implementation

### 3.1 Test Database Functions
Run these SQL commands to test the core functionality:

```sql
-- Test creating a notification (replace UUIDs with actual user IDs)
SELECT create_notification(
  'recipient-user-id'::UUID,
  'actor-user-id'::UUID,
  'like_post',
  'post',
  'post-id'::UUID,
  '{"action": "liked"}'::JSONB
);

-- Test getting notifications
SELECT * FROM get_user_notifications('recipient-user-id'::UUID, 10, 0, false);

-- Test getting unread count
SELECT get_unread_notification_count('recipient-user-id'::UUID);

-- Test marking as read
SELECT mark_notifications_read('recipient-user-id'::UUID, NULL);
```

### 3.2 Test Frontend Integration
1. **Launch the app** and navigate to the notifications screen
2. **Verify no errors** in console logs
3. **Test empty state** displays when no notifications exist
4. **Test pull-to-refresh** functionality
5. **Test notification tapping** (should log to console for now)

### 3.3 Test Automatic Notifications
Create some test data to trigger automatic notifications:

```sql
-- Create test posts and interactions to trigger notifications
-- This should automatically create notifications via triggers

-- Like a post (should trigger post like notification)
INSERT INTO post_likes (user_id, post_id) 
VALUES ('liker-user-id', 'post-id');

-- Comment on a post (should trigger comment notification)
INSERT INTO post_comments (user_id, post_id, content) 
VALUES ('commenter-user-id', 'post-id', 'Great review!');

-- Follow a user (should trigger follow notification)
INSERT INTO user_connections (user_id, friend_id, status) 
VALUES ('follower-id', 'followed-id', 'accepted');
```

---

## 🔧 Step 4: Configuration & Customization

### 4.1 Notification Preferences
The system creates default preferences automatically, but you can customize them:

```typescript
import { useNotificationPreferences } from '@/contexts/NotificationsContext';

function NotificationSettings() {
  const { preferences, updatePreferences } = useNotificationPreferences();
  
  const toggleLikeNotifications = async () => {
    await updatePreferences({
      like_notifications: !preferences?.like_notifications
    });
  };
  
  // ... other preference controls
}
```

### 4.2 Customize Notification Display Text
Modify the `getNotificationDisplayText` method in `notificationsService.ts` to customize how notifications appear:

```typescript
getNotificationDisplayText(notification: Notification): string {
  const actorName = notification.actor_display_name || notification.actor_username;
  
  switch (notification.type) {
    case 'like_post':
      return `${actorName} loved your review! ❤️`;
    // ... customize other types
  }
}
```

---

## 📊 Step 5: Monitoring & Maintenance

### 5.1 Database Monitoring
Monitor notification system performance:

```sql
-- Check notification volume
SELECT COUNT(*) as total_notifications,
       COUNT(*) FILTER (WHERE read_at IS NULL) as unread_notifications
FROM notifications;

-- Check notification types distribution
SELECT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- Check recent notification activity
SELECT DATE(created_at) as date, COUNT(*) as count
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 5.2 Cleanup Old Notifications (Optional)
Set up periodic cleanup of old read notifications:

```sql
-- Clean notifications older than 30 days
SELECT cleanup_old_notifications(30);
```

---

## 🚀 What's Working After Phase 1

✅ **Database Infrastructure**: Complete notification tables and functions  
✅ **Automatic Notifications**: Triggers create notifications for user actions  
✅ **Service Layer**: Full TypeScript service for all notification operations  
✅ **React Context**: State management with real-time updates  
✅ **Updated UI**: Real notification data replaces mock data  
✅ **User Preferences**: Granular notification control  
✅ **Badge Counts**: Unread notification indicators  
✅ **Performance**: Optimized queries with proper indexing  

## 🔮 Coming in Phase 2

🔄 **Real-time Updates**: Live notification delivery via Supabase subscriptions  
📱 **Push Notifications**: Mobile push notification setup  
🎯 **Advanced Filtering**: Smart notification grouping and categorization  
⚡ **Performance Optimization**: Caching and background sync  

---

## 🐛 Troubleshooting

### Common Issues

**1. "Function not found" errors**
- Ensure you ran the complete schema migration
- Check Supabase function logs in Dashboard

**2. "User not authenticated" errors**  
- Verify AuthContext is properly set up
- Check Supabase session is valid

**3. No notifications appearing**
- Check if triggers are working: `SELECT * FROM notifications;`
- Verify user has correct permissions
- Check console logs for service errors

**4. Context errors**
- Ensure NotificationsProvider wraps your app
- Check import paths are correct

### Debug Mode
Enable detailed logging by setting in `notificationsService.ts`:
```typescript
// Add at top of class
private debug = true; // Set to true for detailed logs
```

---

## 📝 Next Steps

1. **Test thoroughly** with real user interactions
2. **Customize notification text** for your app's tone
3. **Add navigation** to specific content when notifications are tapped
4. **Monitor performance** and tune as needed
5. **Prepare for Phase 2** real-time implementation

Phase 1 provides a solid foundation for notifications. The system is now ready for real user interactions and can scale to handle significant notification volume. 