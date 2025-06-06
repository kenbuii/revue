# 🚨 Profile Schema Mismatch & Missing Profile Crisis

## **🎯 Executive Summary**
**All failures stem from 3 critical issues**: wrong column queries, missing profile records, and inconsistent foreign key references.

---

## **🔍 Detailed Root Cause Analysis**

### **Issue 1: Profile Service Column Mismatch** ❌
**Error**: `"column user_profiles.id does not exist"`

**Schema Reality**:
```sql
CREATE TABLE public.user_profiles (
  user_id uuid NOT NULL,  -- ✅ Primary key is user_id, NOT id
  username text NOT NULL UNIQUE,
  display_name text DEFAULT ''::text,
  -- ... other fields
  CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id)
);
```

**But Service Queries Wrong Column**:
- Service tries to query/update using `id` column
- Should be using `user_id` column
- This breaks all profile data loading

### **Issue 2: Missing User Profile Record** ❌
**Error**: `"Key is not present in table \"user_profiles\""`

**Current User State**:
- ✅ **Auth Record**: Exists in `auth.users` (`f77ebec9-8628-4d98-81a4-6a8d14a1d88e`)
- ✅ **Onboarding Data**: Complete in local storage (username: `not_kenneth_`, display_name: `Not Kenneth`)
- ❌ **Profile Record**: MISSING from `user_profiles` table

**Foreign Key Violation**:
```sql
-- Posts table requires user_profiles record to exist
CONSTRAINT posts_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id)
```

**Impact**: Cannot create posts, comments fail, profile data empty

### **Issue 3: Inconsistent Foreign Key References** ❌
**Error**: Comments and related tables have mixed FK references

**Inconsistent Schema**:
```sql
-- Comments references auth.users directly
CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)

-- But comment_likes references user_profiles  
CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id)

-- Posts references BOTH (redundant)
CONSTRAINT posts_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(user_id),
CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
```

**Problem**: Creates dependency issues when user_profiles record missing

---

## **🧪 Diagnostic SQL Queries**

### **Query 1: Verify Profile Table Structure**
```sql
-- Check actual column names in user_profiles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;
```

### **Query 2: Check Missing Profile Record**
```sql
-- Check if user exists in auth.users but missing from user_profiles
SELECT 
  au.id as auth_user_id,
  au.email,
  up.user_id as profile_user_id,
  up.username,
  CASE WHEN up.user_id IS NULL THEN 'MISSING_PROFILE' ELSE 'HAS_PROFILE' END as status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.id = 'f77ebec9-8628-4d98-81a4-6a8d14a1d88e';
```

### **Query 3: Check Foreign Key Dependencies**
```sql
-- Check what tables depend on user_profiles
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'user_profiles';
```

### **Query 4: Test Profile Creation**
```sql
-- Test if we can create missing profile record
INSERT INTO user_profiles (
  user_id,
  username,
  display_name,
  onboarding_completed
) VALUES (
  'f77ebec9-8628-4d98-81a4-6a8d14a1d88e',
  'not_kenneth_',
  'Not Kenneth',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  onboarding_completed = EXCLUDED.onboarding_completed;
```

---

## **🚀 Comprehensive Fix Strategy**

### **Phase 1: Emergency Profile Creation (5 minutes)**
**Goal**: Create missing profile record to unblock posts/comments

**Actions**:
1. **Create Missing Profile**: Insert profile record for current user
2. **Migrate Onboarding Data**: Transfer local storage data to database
3. **Verify Dependencies**: Ensure all FK constraints satisfied

**Expected Result**: User can create posts and comments

### **Phase 2: Service Layer Fixes (10 minutes)**
**Goal**: Fix column name mismatches in all services

**Actions**:
1. **Fix Profile Service**: Update queries to use `user_id` instead of `id`
2. **Fix Update Operations**: Ensure all PATCH operations target correct columns
3. **Update Error Handling**: Handle missing profiles gracefully

**Expected Result**: Profile data loads correctly

### **Phase 3: Schema Consistency (15 minutes)**
**Goal**: Resolve foreign key inconsistencies

**Actions**:
1. **Analyze FK Dependencies**: Map all foreign key relationships
2. **Standardize References**: Decide on auth.users vs user_profiles
3. **Update Comments System**: Ensure consistent FK references

**Expected Result**: No more FK constraint violations

### **Phase 4: Data Migration & Validation (10 minutes)**
**Goal**: Ensure all existing users have profiles

**Actions**:
1. **Audit Missing Profiles**: Find all auth.users without user_profiles
2. **Create Migration**: Bulk create missing profile records
3. **Validate Data Integrity**: Ensure no orphaned records

**Expected Result**: Complete data consistency

---

## **📋 Immediate Action Plan**

### **Step 1: Create Emergency Profile Record**
```sql
-- Create missing profile for current user
INSERT INTO user_profiles (
  user_id,
  username,
  display_name,
  bio,
  onboarding_completed,
  contact_sync_enabled
) VALUES (
  'f77ebec9-8628-4d98-81a4-6a8d14a1d88e',
  'not_kenneth_',
  'Not Kenneth',
  '',
  true,
  true
) ON CONFLICT (user_id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  onboarding_completed = EXCLUDED.onboarding_completed,
  updated_at = now();
```

### **Step 2: Fix Profile Service Queries**
Update `lib/userProfile.ts`:
```typescript
// BEFORE (Wrong)
`user_profiles?id=eq.${userId}&select=*`

// AFTER (Correct)  
`user_profiles?user_id=eq.${userId}&select=*`
```

### **Step 3: Fix Update Operations**
Update all PATCH operations:
```typescript
// BEFORE (Wrong)
`user_profiles?id=eq.${userId}`

// AFTER (Correct)
`user_profiles?user_id=eq.${userId}`
```

### **Step 4: Create Media Preferences**
```sql
-- Insert missing media preferences from onboarding
INSERT INTO user_media_preferences (user_id, media_id, title, media_type, year, image_url, description, source, original_api_id)
VALUES 
  ('f77ebec9-8628-4d98-81a4-6a8d14a1d88e', 'tmdb_tv_247718', 'MobLand', 'tv', '2025', 'https://image.tmdb.org/t/p/w500/abeH7n5pcuQcwYcTxG6DTZvXLP1.jpg', 'Two mob families clash...', 'tmdb', '247718'),
  ('f77ebec9-8628-4d98-81a4-6a8d14a1d88e', 'nyt_9780143127741', 'The Body Keeps the Score', 'book', '2025', 'https://static01.nyt.com/bestsellers/images/9780143127741.jpg', 'How trauma affects...', 'nyt_bestsellers', '9780143127741'),
  ('f77ebec9-8628-4d98-81a4-6a8d14a1d88e', 'nyt_9780804190114', 'On Tyranny', 'book', '2025', 'https://static01.nyt.com/bestsellers/images/9780804190114.jpg', 'Twenty lessons...', 'nyt_bestsellers', '9780804190114');
```

---

## **🎯 Success Criteria**

### **Profile Loading**: ✅ Expected
- Profile page shows username: `not_kenneth_`
- Profile page shows display name: `Not Kenneth`  
- Media preferences show 3 items from onboarding
- No more `column does not exist` errors

### **Post Creation**: ✅ Expected
- Can create posts without FK constraint violations
- Posts show correct author information
- Media items create successfully

### **Comments System**: ✅ Expected
- Can post comments without null returns
- Comments show with proper user information
- Comment likes work correctly

### **Data Integrity**: ✅ Expected
- All users have corresponding profile records
- No orphaned foreign key references
- Consistent schema across all tables

---

## **⚠️ Risk Assessment**

### **High Risk**: Direct Database Manipulation
- **Mitigation**: Use transactions, test on staging first
- **Rollback**: Have user deletion script ready

### **Medium Risk**: Service Layer Changes
- **Mitigation**: Update incrementally, test each change
- **Rollback**: Revert individual service files

### **Low Risk**: Data Migration
- **Mitigation**: Use UPSERT patterns, validate data
- **Rollback**: Delete created records if needed

---

## **🧪 Testing Protocol**

### **Pre-Fix Validation**:
1. Run diagnostic SQL queries
2. Document current error states
3. Backup current data state

### **Post-Fix Validation**:
1. Test profile data loading
2. Test post creation flow
3. Test comments posting
4. Test media preferences display
5. Verify no new errors in console

### **Regression Testing**:
1. Test existing functionality (feed, infinite scroll)
2. Test authentication flows
3. Test navigation and routing
4. Verify performance hasn't degraded

---

**This comprehensive strategy addresses the fundamental schema mismatches causing all current failures while ensuring data integrity and system stability.** 🚀 