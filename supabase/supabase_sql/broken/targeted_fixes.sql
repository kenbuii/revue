-- ============================================================================
-- TARGETED FIXES FOR IDENTIFIED ISSUES
-- Based on diagnosis results - surgical approach
-- ============================================================================

-- Issue #1: Missing find_users_by_email_hash function
-- This function is needed for contact sync functionality

CREATE OR REPLACE FUNCTION public.find_users_by_email_hash(email_hashes TEXT[])
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        up.username,
        up.display_name,
        up.avatar_url
    FROM user_profiles up
    WHERE up.email_hash = ANY(email_hashes)
    AND up.onboarding_completed = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_users_by_email_hash(TEXT[]) TO authenticated;

-- Verification: Check if function was created successfully
SELECT 
    proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND proname = 'find_users_by_email_hash';

-- Success message
SELECT 'find_users_by_email_hash function created successfully! 🎉' as status; 