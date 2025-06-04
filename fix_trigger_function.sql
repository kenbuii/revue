-- FIX TRIGGER FUNCTION - update_media_rating() using wrong field name
-- The function expects media_item_id but posts table uses media_id

-- =========================
-- FIX 1: Check the current function definition
-- =========================

-- Show the current function definition to see what's wrong
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'update_media_rating' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- =========================
-- FIX 2: Create corrected update_media_rating function
-- =========================

-- Drop and recreate the function with correct field name
DROP FUNCTION IF EXISTS public.update_media_rating() CASCADE;

CREATE OR REPLACE FUNCTION public.update_media_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE cases
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update the average rating for the media item
        UPDATE media_items 
        SET popularity_score = (
            SELECT COALESCE(AVG(rating), 0)
            FROM posts 
            WHERE media_id = NEW.media_id  -- Fixed: was NEW.media_item_id
            AND rating IS NOT NULL
        )
        WHERE id = NEW.media_id;  -- Fixed: was NEW.media_item_id
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE case  
    IF TG_OP = 'DELETE' THEN
        -- Update the average rating for the media item
        UPDATE media_items 
        SET popularity_score = (
            SELECT COALESCE(AVG(rating), 0)
            FROM posts 
            WHERE media_id = OLD.media_id  -- Fixed: was OLD.media_item_id
            AND rating IS NOT NULL
        )
        WHERE id = OLD.media_id;  -- Fixed: was OLD.media_item_id
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- FIX 3: Recreate the trigger
-- =========================

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_media_rating_update ON posts;

CREATE TRIGGER trigger_media_rating_update
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_media_rating();

-- =========================
-- VERIFICATION
-- =========================

DO $$
BEGIN
    RAISE NOTICE '🔧 TRIGGER FUNCTION FIX COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Fixed update_media_rating() function:';
    RAISE NOTICE '   - Changed media_item_id → media_id';
    RAISE NOTICE '   - Recreated trigger with fixed function';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Post creation should now work without trigger errors!';
END $$; 