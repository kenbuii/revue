-- FIX NOTIFICATIONS FUNCTION - FINAL
-- Create a view to map between app expectations and database schema

BEGIN;

-- Drop any potentially broken notifications function
DROP FUNCTION IF EXISTS public.get_user_notifications(UUID, INTEGER, INTEGER, BOOLEAN) CASCADE;

-- Create a view that maps recipient_id to user_id for compatibility
CREATE OR REPLACE VIEW public.notifications_view AS
SELECT 
    id,
    recipient_id as user_id,
    actor_id,
    type,
    entity_type,
    entity_id,
    metadata,
    read_at,
    created_at
FROM public.notifications;

-- Update the notifications function to use the view
CREATE OR REPLACE FUNCTION public.get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    FROM notifications_view n
    JOIN user_profiles up ON n.actor_id = up.id
    WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR n.read_at IS NULL)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON notifications_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications(UUID, INTEGER, INTEGER, BOOLEAN) TO authenticated;

COMMIT;

SELECT 'NOTIFICATIONS VIEW AND FUNCTION FIXED!' as status; 