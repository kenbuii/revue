# 🔧 Surgical Schema Consistency Fix Strategy

## 🎯 **PROBLEM ANALYSIS**

**Symptoms:**
- Feed displays "unknown user" instead of usernames/display names
- Media preferences not populating in user profiles
- JOINs between `posts`/`user_media_preferences` and `user_profiles` failing

**Root Cause:**
Column name inconsistency in `user_profiles` table and related foreign key references:
- Some code expects `user_profiles.user_id`
- Other code expects `user_profiles.id`
- Mismatched JOINs cause data retrieval failures

---

## 🔍 **DIAGNOSIS PROTOCOL**

**STEP 1: Run the diagnosis SQL** (`supabase/schema_consistency_diagnosis.sql`)

**STEP 2: Analyze results to determine:**

### **Scenario A: user_profiles has `user_id` column**
- Primary key: `user_id`
- Foreign keys reference: `user_profiles.user_id`
- **Fix needed:** Update queries using `user_profiles.id`

### **Scenario B: user_profiles has `id` column**
- Primary key: `id`  
- Foreign keys reference: `user_profiles.id`
- **Fix needed:** Update queries using `user_profiles.user_id`

### **Scenario C: Mixed/Broken state**
- Inconsistent schema with broken foreign keys
- **Fix needed:** Standardize to one approach

---

## ⚡ **SURGICAL FIX STRATEGY**

### **Phase 1: Emergency Query Fixes (Immediate Relief)**

Based on diagnosis results, apply the appropriate fix:

#### **If user_profiles uses `user_id` column:**
```sql
-- Fix functions that incorrectly use 'id'
CREATE OR REPLACE FUNCTION get_for_you_feed(...)
-- Change: up.id → up.user_id
-- Change: p.user_id = up.id → p.user_id = up.user_id
```

#### **If user_profiles uses `id` column:**
```sql
-- Fix functions that incorrectly use 'user_id'
CREATE OR REPLACE FUNCTION get_for_you_feed(...)
-- Change: up.user_id → up.id  
-- Change: p.user_id = up.user_id → p.user_id = up.id
```

### **Phase 2: Function Consistency Fixes**

**Target Functions to Fix:**
1. `get_for_you_feed()` - Feed query function
2. `get_user_media_preferences()` - Media preferences function
3. `ensure_user_profile_exists()` - Profile validation function
4. Any other functions identified in diagnosis

**Fix Template:**
```sql
-- Before (if user_profiles has user_id):
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.id  -- WRONG

-- After:
FROM posts p  
LEFT JOIN user_profiles up ON p.user_id = up.user_id  -- CORRECT
```

### **Phase 3: Frontend Query Updates**

**Check and fix:**
- `lib/userProfile.ts` - User profile service queries
- `lib/posts.ts` - Post queries with user joins
- Any direct PostgREST queries using wrong column names

---

## 🎯 **SPECIFIC FIX SCRIPTS**

### **Fix Script A: If user_profiles has `user_id` column**

```sql
-- Fix feed functions
CREATE OR REPLACE FUNCTION get_for_you_feed(
    p_user_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_include_media_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (...) AS $$
BEGIN
    RETURN QUERY
    SELECT ...
    FROM posts p
    INNER JOIN user_profiles up ON p.user_id = up.user_id  -- FIXED: was up.id
    LEFT JOIN media_items mi ON p.media_item_id = mi.id
    WHERE ...;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix media preferences function
CREATE OR REPLACE FUNCTION get_user_media_preferences(p_user_id UUID)
RETURNS TABLE (...) AS $$
BEGIN
    RETURN QUERY
    SELECT ...
    FROM user_media_preferences ump
    WHERE ump.user_id = p_user_id  -- This should be correct
    ORDER BY ump.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix profile validation function
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_profiles WHERE user_id = p_user_id  -- FIXED: was id = p_user_id
    ) INTO profile_exists;
    
    IF NOT profile_exists THEN
        INSERT INTO user_profiles (user_id, ...) VALUES (p_user_id, ...);  -- FIXED
    END IF;
    
    RETURN jsonb_build_object('success', true, 'profile_existed', profile_exists);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Fix Script B: If user_profiles has `id` column**

```sql
-- Fix feed functions  
CREATE OR REPLACE FUNCTION get_for_you_feed(...)
RETURNS TABLE (...) AS $$
BEGIN
    RETURN QUERY
    SELECT ...
    FROM posts p
    INNER JOIN user_profiles up ON p.user_id = up.id  -- FIXED: was up.user_id
    LEFT JOIN media_items mi ON p.media_item_id = mi.id
    WHERE ...;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix profile validation function
CREATE OR REPLACE FUNCTION public.ensure_user_profile_exists(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_profiles WHERE id = p_user_id  -- FIXED: was user_id = p_user_id
    ) INTO profile_exists;
    
    IF NOT profile_exists THEN
        INSERT INTO user_profiles (id, ...) VALUES (p_user_id, ...);  -- FIXED
    END IF;
    
    RETURN jsonb_build_object('success', true, 'profile_existed', profile_exists);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ✅ **VALIDATION PROTOCOL**

### **Test 1: Feed Query Validation**
```sql
-- Should return user data, not nulls
SELECT 
    p.id, p.content, up.username, up.display_name,
    CASE WHEN up.username IS NULL THEN 'STILL_BROKEN' ELSE 'FIXED' END as status
FROM posts p
LEFT JOIN user_profiles up ON p.user_id = up.[CORRECT_COLUMN]
LIMIT 5;
```

### **Test 2: Media Preferences Validation**
```sql
-- Should return user media preferences with profile data
SELECT 
    ump.title, up.username,
    CASE WHEN up.username IS NULL THEN 'STILL_BROKEN' ELSE 'FIXED' END as status
FROM user_media_preferences ump
LEFT JOIN user_profiles up ON ump.user_id = up.[CORRECT_COLUMN]
LIMIT 5;
```

### **Test 3: Frontend Validation**
1. Check feed displays actual usernames instead of "unknown user"
2. Check user profile shows media preferences
3. Verify new posts still work without foreign key errors

---

## 🛡️ **SAFETY MEASURES**

### **Before Applying Fixes:**
1. **Backup current function definitions**
2. **Test fixes on staging/development environment first**
3. **Run diagnosis SQL to understand current state**

### **Rollback Plan:**
- Keep original function definitions in comments
- Have rollback SQL ready
- Monitor error logs after deployment

### **Minimal Risk Approach:**
- Fix one function at a time
- Test each fix before proceeding
- Use `CREATE OR REPLACE` to avoid dropping existing functions

---

## 🎯 **EXECUTION CHECKLIST**

- [ ] **Step 1:** Run `schema_consistency_diagnosis.sql` in Supabase
- [ ] **Step 2:** Determine if user_profiles uses `user_id` or `id` column
- [ ] **Step 3:** Apply appropriate fix script (A or B)
- [ ] **Step 4:** Run validation queries
- [ ] **Step 5:** Test frontend feed and profile functionality
- [ ] **Step 6:** Monitor for any new errors

This surgical approach fixes the JOIN mismatches without touching the actual table structure, minimizing risk of breaking other functionality. 