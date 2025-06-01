# Supabase Integration: User Preferences & Profiles

This document explains how user preferences and profile data are now saved to both local storage AND Supabase for persistence and cross-device sync.

## 🏗️ Architecture Overview

### Dual Storage Strategy
The app now uses a **hybrid approach**:

1. **Local Storage (AsyncStorage)** - Immediate access, offline support
2. **Supabase Database** - Persistence, cross-device sync, social features

### Key Benefits
- ✅ **Offline-first**: Works without internet connection
- ✅ **Graceful degradation**: Falls back to local storage if Supabase unavailable
- ✅ **Cross-device sync**: Login on any device to get your preferences
- ✅ **Social features**: Other users can discover your media preferences
- ✅ **WebSocket-safe**: Uses HTTP-only requests (no realtime subscriptions)

## 📊 Database Schema

### Core Tables

**`user_profiles`**
```sql
- id (UUID) - Links to auth.users
- username (TEXT)
- display_name (TEXT) 
- bio (TEXT)
- avatar_url (TEXT)
- email_hash (TEXT) - For privacy-friendly contact matching
- onboarding_completed (BOOLEAN)
- contact_sync_enabled (BOOLEAN)
```

**`user_media_preferences`**
```sql
- user_id (UUID)
- media_id (TEXT) - e.g., "tmdb_movie_123"
- title (TEXT)
- media_type (TEXT) - 'movie', 'tv', 'book'
- year (TEXT)
- image_url (TEXT)
- description (TEXT)
- source (TEXT) - 'tmdb', 'google_books', 'popular'
- original_api_id (TEXT)
- added_during_onboarding (BOOLEAN)
```

## 🔄 Data Flow

### 1. During Onboarding
```
User Input → saveOnboardingData() → Local Storage + Supabase
```

**What happens:**
1. Data saves immediately to AsyncStorage
2. If user is authenticated, also saves to Supabase
3. If offline, Supabase save is skipped (graceful degradation)

### 2. After Login
```
Login Success → syncOnboardingDataToSupabase() → Sync Local → Supabase
```

**What happens:**
1. User logs in successfully
2. App automatically syncs any local onboarding data to Supabase
3. Ensures cross-device consistency

### 3. App Initialization
```
App Start → Check Auth → Sync Data (if authenticated)
```

## 🛠️ Implementation Details

### Updated Functions

**`saveOnboardingData(data)`**
- Saves to AsyncStorage immediately
- If authenticated, also saves to Supabase via HTTP request
- Never throws errors (graceful degradation)

**`syncOnboardingDataToSupabase()`**
- Called automatically after login
- Syncs any local data that hasn't been saved to Supabase
- Ensures data persistence across devices

**`completeOnboarding()`**
- Marks onboarding complete in local storage
- Also updates Supabase if authenticated

### Supabase RPC Functions

**`save_user_onboarding_data()`**
- Main function for saving all onboarding data
- Handles profile updates and media preferences
- Atomic transaction (all-or-nothing)

**`find_users_by_email_hash()`**
- Used for contact sync feature
- Finds existing users by hashed emails
- Privacy-friendly (no plain emails stored)

## 🔒 Security & Privacy

### Row Level Security (RLS)
- Users can only access their own data
- Public profiles visible to authenticated users
- Secure RPC functions with proper access controls

### Email Privacy
- Email addresses are hashed (SHA256) before storage
- Contact sync works without exposing actual emails
- Users maintain privacy while enabling friend discovery

### Authentication
- Uses Supabase Auth JWT tokens
- HTTP-only requests (no WebSocket vulnerabilities)
- Graceful fallback when offline

## 📱 User Experience

### Offline Capability
- App works fully offline using local storage
- Data syncs automatically when connection restored
- No interruption to user experience

### Cross-Device Sync
- Login on new device → preferences appear immediately
- Onboarding state preserved across devices
- Media selections available everywhere

### Error Handling
- Supabase errors don't break the app
- Local storage continues working
- Clear logging for debugging

## 🔧 Setup Instructions

### 1. Database Setup
```bash
# Run the SQL schema in Supabase SQL Editor
cat supabase/schema.sql
```

### 2. Environment Variables
```bash
# Ensure these are in your .env file
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Testing
1. Complete onboarding flow
2. Check `user_profiles` table in Supabase
3. Verify media preferences in `user_media_preferences`
4. Test login on different device/simulator

## 🐛 Debugging

### Common Issues

**Data not saving to Supabase:**
- Check environment variables
- Verify database schema is applied
- Check user authentication status
- Look for error logs in console

**RPC function errors:**
- Ensure all database functions exist
- Check parameter types match
- Verify RLS policies allow access

### Debug Logging
The app includes comprehensive logging:
- `💾 Onboarding data saved locally`
- `✅ Onboarding data saved to Supabase`
- `🔄 Syncing local onboarding data to Supabase`
- `❌ Supabase save error` (with details)

## 🚀 Next Steps

### Immediate Benefits
- User preferences persist across devices
- Contact sync can match real users
- Foundation for social features

### Future Enhancements
- Pull user data for profile screens
- Friend recommendations based on media preferences
- Real-time friend activity (when WebSocket-safe)
- Media recommendation engine

## 📋 Migration Notes

### From Local-Only Storage
- Existing local data automatically syncs to Supabase on next login
- No data loss during migration
- Backward compatible

### Production Deployment
- Ensure database schema is applied in production Supabase
- Verify environment variables in production build
- Test cross-device sync in production environment 