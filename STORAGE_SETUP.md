# Supabase Storage Setup for Profile Pictures

This guide explains how to set up the storage bucket for user profile pictures in Supabase.

## 🗂️ Storage Bucket Setup

### 1. Create Storage Bucket
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Set the following:
   - **Name**: `profile-images`
   - **Public bucket**: ✅ **Enabled** (so images can be accessed via public URLs)
   - **File size limit**: `10 MB` (reasonable for profile pictures)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp`

### 2. Set Storage Policies (RLS)
After creating the bucket, you need to set up Row Level Security policies:

1. Go to **Storage** → **Policies**
2. For the `profile-images` bucket, create these policies:

**Policy 1: Allow Upload (INSERT)**
```sql
CREATE POLICY "Users can upload their own profile images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Policy 2: Allow Public Read (SELECT)**
```sql
CREATE POLICY "Profile images are publicly viewable" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-images');
```

**Policy 3: Allow Update (UPDATE)**
```sql
CREATE POLICY "Users can update their own profile images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Policy 4: Allow Delete (DELETE)**
```sql
CREATE POLICY "Users can delete their own profile images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 📁 File Structure
Profile images will be stored with this structure:
```
profile-images/
  ├── {user-id}/
  │   ├── profile-{timestamp1}.jpg
  │   ├── profile-{timestamp2}.jpg
  │   └── ...
  └── {other-user-id}/
      └── ...
```

## 🔗 URL Format
Public URLs will follow this format:
```
https://your-project.supabase.co/storage/v1/object/public/profile-images/{user-id}/profile-{timestamp}.jpg
```

## ✅ Testing
After setup, test the upload functionality:
1. Run your app in development
2. Go through the onboarding flow to Step 3
3. Try uploading a profile picture
4. Check the Supabase Storage dashboard to see if the file was uploaded
5. Verify the image displays in the app

## 🚨 Troubleshooting
- **403 Errors**: Check that RLS policies are set correctly
- **Bucket not found**: Ensure bucket name is exactly `profile-images`
- **Upload fails**: Check file size limits and MIME type restrictions
- **Images don't display**: Verify the public URL format and bucket public settings 