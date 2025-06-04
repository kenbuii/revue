-- SIMPLE DIAGNOSIS - All results in one query
-- This will show everything we need to know

SELECT 
    '1. Profile Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01')
        THEN '✅ Profile EXISTS'
        ELSE '❌ Profile MISSING'
    END as result,
    'Main issue if missing' as notes

UNION ALL

SELECT 
    '2. Auth User Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '670e0647-bfcb-4322-aa76-059452af9e01')
        THEN '✅ Auth user EXISTS'
        ELSE '❌ Auth user MISSING'
    END as result,
    'Should exist from signup' as notes

UNION ALL

SELECT 
    '3. Foreign Key Constraint' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'user_profiles' 
            AND constraint_type = 'FOREIGN KEY'
        )
        THEN '✅ FK constraint EXISTS'
        ELSE '❌ No FK constraint'
    END as result,
    'Explains why profile not auto-created' as notes

UNION ALL

SELECT 
    '4. Media Preferences Count' as check_type,
    COALESCE((
        SELECT COUNT(*)::TEXT 
        FROM user_media_preferences 
        WHERE user_id = '670e0647-bfcb-4322-aa76-059452af9e01'
    ), '0') as result,
    'Should show saved preferences' as notes

UNION ALL

SELECT 
    '5. Source Check Constraint' as check_type,
    COALESCE((
        SELECT cc.check_clause
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.check_constraints cc 
            ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'user_media_preferences'
        AND tc.constraint_type = 'CHECK'
        AND tc.constraint_name LIKE '%source%'
        LIMIT 1
    ), 'No source constraint found') as result,
    'Shows what source values are allowed' as notes

ORDER BY check_type; 