-- FIX REAL ONBOARDING - Handle the actual data your app is sending

-- Step 1: Clear old test data and start fresh
DELETE FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Step 2: Update the profile with the REAL data from your onboarding
UPDATE user_profiles 
SET 
    display_name = 'Test Guy',
    username = 'test_guy_',
    updated_at = NOW()
WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Step 3: Check what sources are actually allowed
SELECT 
    'Current Source Constraint:' as info,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'user_media_preferences'
AND tc.constraint_type = 'CHECK'
AND tc.constraint_name LIKE '%source%';

-- Step 4: Let's try to manually insert one of your real media items to see what fails
DO $$
BEGIN
    -- Try inserting a TMDB item (should work according to constraint)
    INSERT INTO user_media_preferences (
        user_id, 
        media_id, 
        title, 
        media_type, 
        source, 
        year,
        description,
        image_url,
        original_api_id,
        added_during_onboarding
    ) VALUES (
        '670e0647-bfcb-4322-aa76-059452af9e01'::UUID,
        'tmdb_tv_291256',
        'Sara - Woman in the Shadows',
        'tv',
        'tmdb',  -- This should be allowed
        '2025',
        'The suspicious death of her son pushes a former secret agent back into action.',
        'https://image.tmdb.org/t/p/w500/nqKP7dOzbtP2Pmvec0ntOJDM6mb.jpg',
        '291256',
        TRUE
    );
    
    RAISE NOTICE '✅ Successfully inserted TMDB item';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ Failed to insert TMDB item: %', SQLERRM;
END $$;

-- Step 5: Check what we have now
SELECT 
    'After Test Insert:' as status,
    COUNT(*) as media_count,
    string_agg(DISTINCT source, ', ') as sources_used
FROM user_media_preferences 
WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01';

-- Step 6: Show current profile data
SELECT 
    'Current Profile:' as status,
    username,
    display_name,
    onboarding_completed
FROM user_profiles 
WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01'; 