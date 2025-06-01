# Database Setup Guide

This guide explains how to set up the database schema for user profiles and preferences in Supabase.

## 🔧 Setup Steps

### 1. Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Run the Schema
1. Copy the entire contents of `supabase/schema.sql`
2. Paste it into the SQL editor
3. Click **Run** to execute the schema

### 3. Verify Tables Created
After running the schema, you should see these tables in the **Table Editor**:

- `user_profiles` - Main user profile data
- `user_media_preferences` - Selected movies, TV shows, books
- `user_connections` - Friend relationships
- `contact_invitations` - Pending invitations

## 📋 What the Schema Includes

### Tables

**`user_profiles`**
- Extends Supabase's built-in `auth.users`
- Stores username, display name, bio, avatar URL
- Email hash for privacy-friendly contact matching
- Onboarding completion status

**`user_media_preferences`**
- Stores selected media items from onboarding
- Supports movies, TV shows, and books
- Links to external API IDs (TMDb, Google Books)
- Tracks source and onboarding context

**`user_connections`**
- Friend relationships between users
- Support for different connection types
- Tracks how connections were discovered

**`contact_invitations`**
- Pending invitations to users not yet on platform
- Uses hashed emails for privacy

### Functions

**`save_user_onboarding_data()`**
- Main function for saving onboarding data
- Handles profile updates and media preferences
- Called from the app's `saveOnboardingData()` function

**`find_users_by_email_hash()`**
- Used for contact sync feature
- Finds existing users by hashed email addresses

**`get_user_media_preferences()`**
- Retrieves a user's media preferences
- Used for profile display and recommendations

### Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Public profiles visible to authenticated users
- Secure RPC functions with proper access controls

## 🔒 Environment Requirements

Make sure your `.env` file has:
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## ✅ Testing

After setup, test the integration:
1. Complete the onboarding flow in the app
2. Check the `user_profiles` table for your data
3. Verify media preferences in `user_media_preferences`
4. Test contact sync functionality

## 🔄 Migration from Local Storage

The updated auth service will:
1. Continue saving to local storage (for offline access)
2. Also save to Supabase (for persistence and sharing)
3. Gracefully handle offline scenarios
4. Sync local data when connection is restored 