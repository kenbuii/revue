-- ============================================================================
-- PHASE 1: NOTIFICATIONS SYSTEM - DATABASE SCHEMA
-- Comprehensive notifications infrastructure for Revue app
-- ============================================================================

BEGIN;

-- ==========================================
-- NOTIFICATIONS CORE TABLES
-- ==========================================

-- Main notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'like_post', 'like_comment', 'comment_post', 'reply_comment', 
        'follow_user', 'post_mention', 'comment_mention', 'new_post_from_followed'
    )),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('post', 'comment', 'user')),
    entity_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate notifications for same action
    UNIQUE(recipient_id, actor_id, type, entity_type, entity_id)
);

-- User notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    like_notifications BOOLEAN DEFAULT true,
    comment_notifications BOOLEAN DEFAULT true,
    follow_notifications BOOLEAN DEFAULT true,
    mention_notifications BOOLEAN DEFAULT true,
    post_notifications BOOLEAN DEFAULT true, -- From followed users
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    quiet_hours_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push notification tokens table (for Expo push notifications)
CREATE TABLE IF NOT EXISTS push_notification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT DEFAULT 'unknown' CHECK (device_type IN ('ios', 'android', 'web', 'unknown')),
    device_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Primary query indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread_created ON notifications(recipient_id, created_at DESC) WHERE read_at IS NULL;

-- Push tokens indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_notification_tokens(user_id, is_active) WHERE is_active = true;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to create notification with deduplication
CREATE OR REPLACE FUNCTION create_notification(
    p_recipient_id UUID,
    p_actor_id UUID,
    p_type TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    recipient_prefs RECORD;
BEGIN
    -- Don't create notification if actor and recipient are the same
    IF p_actor_id = p_recipient_id THEN
        RETURN NULL;
    END IF;
    
    -- Check user's notification preferences
    SELECT * INTO recipient_prefs 
    FROM notification_preferences 
    WHERE user_id = p_recipient_id;
    
    -- If no preferences exist, create default ones
    IF recipient_prefs IS NULL THEN
        INSERT INTO notification_preferences (user_id) 
        VALUES (p_recipient_id);
        recipient_prefs := ROW(p_recipient_id, true, true, true, true, true, true, true, '22:00:00', '08:00:00', false, NOW(), NOW());
    END IF;
    
    -- Check if this type of notification is enabled
    CASE p_type
        WHEN 'like_post', 'like_comment' THEN
            IF NOT recipient_prefs.like_notifications THEN RETURN NULL; END IF;
        WHEN 'comment_post', 'reply_comment' THEN
            IF NOT recipient_prefs.comment_notifications THEN RETURN NULL; END IF;
        WHEN 'follow_user' THEN
            IF NOT recipient_prefs.follow_notifications THEN RETURN NULL; END IF;
        WHEN 'post_mention', 'comment_mention' THEN
            IF NOT recipient_prefs.mention_notifications THEN RETURN NULL; END IF;
        WHEN 'new_post_from_followed' THEN
            IF NOT recipient_prefs.post_notifications THEN RETURN NULL; END IF;
    END CASE;
    
    -- Insert notification with ON CONFLICT DO UPDATE to handle duplicates
    INSERT INTO notifications (recipient_id, actor_id, type, entity_type, entity_id, metadata)
    VALUES (p_recipient_id, p_actor_id, p_type, p_entity_type, p_entity_id, p_metadata)
    ON CONFLICT (recipient_id, actor_id, type, entity_type, entity_id) 
    DO UPDATE SET 
        created_at = NOW(),
        read_at = NULL,
        metadata = EXCLUDED.metadata
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Mark all unread notifications as read
        UPDATE notifications 
        SET read_at = NOW() 
        WHERE recipient_id = p_user_id AND read_at IS NULL;
    ELSE
        -- Mark specific notifications as read
        UPDATE notifications 
        SET read_at = NOW() 
        WHERE recipient_id = p_user_id 
        AND id = ANY(p_notification_ids) 
        AND read_at IS NULL;
    END IF;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notifications with user details
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
) RETURNS TABLE (
    id UUID,
    actor_id UUID,
    actor_username TEXT,
    actor_display_name TEXT,
    actor_avatar_url TEXT,
    type TEXT,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.actor_id,
        up.username as actor_username,
        up.display_name as actor_display_name,
        up.avatar_url as actor_avatar_url,
        n.type,
        n.entity_type,
        n.entity_id,
        n.metadata,
        n.read_at,
        n.created_at
    FROM notifications n
    JOIN user_profiles up ON n.actor_id = up.id
    WHERE n.recipient_id = p_user_id
    AND (NOT p_unread_only OR n.read_at IS NULL)
    ORDER BY n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE recipient_id = p_user_id AND read_at IS NULL;
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- AUTOMATIC NOTIFICATION TRIGGERS
-- ==========================================

-- Function to handle post like notifications
CREATE OR REPLACE FUNCTION handle_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
BEGIN
    -- Get the post author
    SELECT user_id INTO post_author_id 
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Create notification
    PERFORM create_notification(
        post_author_id,
        NEW.user_id,
        'like_post',
        'post',
        NEW.post_id,
        jsonb_build_object('action', 'liked')
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle comment notifications
CREATE OR REPLACE FUNCTION handle_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    parent_comment_author_id UUID;
BEGIN
    -- Get the post author
    SELECT user_id INTO post_author_id 
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Notify post author about new comment
    PERFORM create_notification(
        post_author_id,
        NEW.user_id,
        'comment_post',
        'comment',
        NEW.id,
        jsonb_build_object('post_id', NEW.post_id)
    );
    
    -- If this is a reply, notify the parent comment author
    IF NEW.parent_comment_id IS NOT NULL THEN
        SELECT user_id INTO parent_comment_author_id 
        FROM post_comments 
        WHERE id = NEW.parent_comment_id;
        
        PERFORM create_notification(
            parent_comment_author_id,
            NEW.user_id,
            'reply_comment',
            'comment',
            NEW.id,
            jsonb_build_object('parent_comment_id', NEW.parent_comment_id, 'post_id', NEW.post_id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle follow notifications
CREATE OR REPLACE FUNCTION handle_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create notification for accepted connections
    IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
        PERFORM create_notification(
            NEW.friend_id,
            NEW.user_id,
            'follow_user',
            'user',
            NEW.user_id,
            jsonb_build_object('connection_type', NEW.connection_type)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new post notifications for followers
CREATE OR REPLACE FUNCTION handle_new_post_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_id UUID;
BEGIN
    -- Notify all followers of this user
    FOR follower_id IN 
        SELECT user_id FROM user_connections 
        WHERE friend_id = NEW.user_id 
        AND status = 'accepted' 
        AND connection_type IN ('friend', 'follow')
    LOOP
        PERFORM create_notification(
            follower_id,
            NEW.user_id,
            'new_post_from_followed',
            'post',
            NEW.id,
            jsonb_build_object('media_id', NEW.media_id)
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic notifications
DROP TRIGGER IF EXISTS trigger_post_like_notification ON post_likes;
CREATE TRIGGER trigger_post_like_notification
    AFTER INSERT ON post_likes
    FOR EACH ROW EXECUTE FUNCTION handle_post_like_notification();

DROP TRIGGER IF EXISTS trigger_comment_notification ON post_comments;
CREATE TRIGGER trigger_comment_notification
    AFTER INSERT ON post_comments
    FOR EACH ROW EXECUTE FUNCTION handle_comment_notification();

DROP TRIGGER IF EXISTS trigger_follow_notification ON user_connections;
CREATE TRIGGER trigger_follow_notification
    AFTER INSERT OR UPDATE ON user_connections
    FOR EACH ROW EXECUTE FUNCTION handle_follow_notification();

DROP TRIGGER IF EXISTS trigger_new_post_notification ON posts;
CREATE TRIGGER trigger_new_post_notification
    AFTER INSERT ON posts
    FOR EACH ROW EXECUTE FUNCTION handle_new_post_notification();

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Notification preferences policies
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Push tokens policies
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON push_notification_tokens;
CREATE POLICY "Users can manage their own push tokens" ON push_notification_tokens
    FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- ==========================================

-- Function to clean up old read notifications (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE read_at IS NOT NULL 
    AND read_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger for notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_notification_tokens_updated_at 
    BEFORE UPDATE ON push_notification_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify tables were created
SELECT 'NOTIFICATIONS SCHEMA VERIFICATION' as status;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notifications', 'notification_preferences', 'push_notification_tokens');

-- Verify functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%'; 