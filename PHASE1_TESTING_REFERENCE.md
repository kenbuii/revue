# 🧪 Phase 1 Notifications Testing Reference

## Overview
This document contains testing instructions for Phase 1 notifications system that were discussed but not fully executed. Use this when you're ready to test the notifications functionality.

---

## **🔍 Step 1: Check Existing Users**

### Get All Users
Run this in Supabase SQL Editor to see what users exist:

```sql
-- Check all users regardless of onboarding status
SELECT 
    id, 
    username, 
    display_name,
    onboarding_completed,
    created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 10;
```

### Check Specific User
Replace the UUID with your actual logged-in user ID:

```sql
-- Check your specific user (replace UUID with your user ID)
SELECT 
    id, 
    username, 
    display_name,
    onboarding_completed,
    created_at
FROM user_profiles 
WHERE id = 'e87b0230-119f-4e54-a3fb-1063920a523e';
```

---

## **🛠️ Step 2: Prepare Test Users**

### Option A: Update Existing User for Testing
```sql
-- Mark your user as having completed onboarding
UPDATE user_profiles 
SET onboarding_completed = true,
    display_name = COALESCE(display_name, 'Test User'),
    username = COALESCE(username, 'testuser')
WHERE id = 'e87b0230-119f-4e54-a3fb-1063920a523e';
```

### Option B: Create Second Test User
```sql
-- Create a test "actor" user (someone to send notifications from)
INSERT INTO user_profiles (id, username, display_name, onboarding_completed)
VALUES (
    gen_random_uuid(),
    'test_actor',
    'Test Actor User', 
    true
);
```

---

## **🧪 Step 3: Create Test Notifications**

### Method 1: Direct Notification Creation
```sql
-- Get user IDs first
SELECT id, username FROM user_profiles WHERE onboarding_completed = true LIMIT 5;

-- Create a test notification (replace UUIDs with real user IDs)
SELECT create_notification(
  'recipient-user-id-here'::UUID,  -- Replace with actual recipient user ID
  'actor-user-id-here'::UUID,      -- Replace with actual actor user ID  
  'like_post',
  'post',
  gen_random_uuid(),               -- Fake post ID for testing
  '{"action": "liked", "test": true}'::JSONB
);
```

### Method 2: Test Different Notification Types
```sql
-- Test like notification
SELECT create_notification(
  'recipient-id'::UUID,
  'actor-id'::UUID,
  'like_post',
  'post',
  gen_random_uuid(),
  '{"action": "liked"}'::JSONB
);

-- Test comment notification  
SELECT create_notification(
  'recipient-id'::UUID,
  'actor-id'::UUID,
  'comment_post',
  'comment',
  gen_random_uuid(),
  '{"post_id": "some-post-id"}'::JSONB
);

-- Test follow notification
SELECT create_notification(
  'recipient-id'::UUID,
  'actor-id'::UUID,
  'follow_user',
  'user',
  'actor-id'::UUID,
  '{"connection_type": "follow"}'::JSONB
);

-- Test new post notification
SELECT create_notification(
  'recipient-id'::UUID,
  'actor-id'::UUID,
  'new_post_from_followed',
  'post',
  gen_random_uuid(),
  '{"media_id": "some-media-id"}'::JSONB
);
```

### Method 3: Trigger Automatic Notifications (requires real posts)
```sql
-- Like someone's post (triggers automatic notification)
INSERT INTO post_likes (user_id, post_id) 
VALUES ('your-user-id', 'some-post-id');

-- Comment on someone's post (triggers automatic notification)  
INSERT INTO post_comments (user_id, post_id, content)
VALUES ('your-user-id', 'some-post-id', 'Great review!');

-- Follow someone (triggers automatic notification)
INSERT INTO user_connections (user_id, friend_id, status) 
VALUES ('follower-id', 'followed-id', 'accepted');
```

---

## **✅ Step 4: Verify Notifications in App**

After creating test notifications, check these in your app:

### Frontend Tests
1. **Navigate to notifications screen** - should show your test notifications
2. **Check unread count** - should show badge with number of unread notifications
3. **Tap notification** - should log the notification type and entity ID to console
4. **Pull-to-refresh** - should refresh the list smoothly
5. **Mark as read** - unread indicators should disappear
6. **Mark all as read** - all notifications should be marked as read

### Expected Notification Display
- **Like notification**: "Test Actor User liked your review"
- **Comment notification**: "Test Actor User commented on your review"  
- **Follow notification**: "Test Actor User started following you"
- **New post notification**: "Test Actor User posted a new review"

### Console Logs to Look For
```
🔔 Loading initial notifications data...
✅ Loaded X notifications, Y unread
🔄 Refreshing notifications...
✅ Marked X notifications as read
```

---

## **🔧 Troubleshooting**

### No Notifications Appearing
1. Check user IDs are correct in SQL
2. Verify user is logged in as the recipient
3. Check console for service errors
4. Verify database functions were created successfully

### Notifications Not Triggering Automatically  
1. Check if posts/users exist for automatic triggers
2. Verify triggers are enabled: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE '%notification%';`
3. Check notification preferences aren't blocking: `SELECT * FROM notification_preferences WHERE user_id = 'your-id';`

### Display Issues
1. Check notification text formatting in `notificationsService.getNotificationDisplayText()`
2. Verify avatar URLs are valid
3. Check timestamp formatting

---

## **📊 Monitoring Queries**

### Check All Notifications
```sql
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
```

### Check Notification Preferences  
```sql
SELECT * FROM notification_preferences WHERE user_id = 'your-user-id';
```

### Check Unread Count
```sql
SELECT get_unread_notification_count('your-user-id'::UUID);
```

### View Recent Notification Activity
```sql
SELECT 
    n.type,
    n.created_at,
    actor.username as actor,
    recipient.username as recipient
FROM notifications n
JOIN user_profiles actor ON n.actor_id = actor.id  
JOIN user_profiles recipient ON n.recipient_id = recipient.id
ORDER BY n.created_at DESC
LIMIT 20;
```

---

## **🎯 Test Success Criteria**

Phase 1 testing is successful when:

✅ Notifications appear in the app  
✅ Unread count displays correctly  
✅ Mark as read functionality works  
✅ Pull-to-refresh operates smoothly  
✅ Different notification types display proper text  
✅ No console errors during normal operation  
✅ Notification preferences can be viewed  
✅ Automatic triggers create notifications  

Once all criteria are met, Phase 1 is fully functional and ready for Phase 2 (real-time updates). 