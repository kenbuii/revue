-- CREATE MISSING SCHEMA SCRIPT
-- This creates the tables your functions expect to exist

-- Enable RLS (Row Level Security) and UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bookmarks table (needed for get_user_bookmarks and add_bookmark)
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    post_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Create posts table (needed for bookmarks JOIN in get_user_bookmarks)
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_media_preferences table (needed for save_user_onboarding_data)
CREATE TABLE IF NOT EXISTS public.user_media_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    media_id TEXT NOT NULL,
    title TEXT,
    media_type TEXT,
    year TEXT,
    image_url TEXT,
    description TEXT,
    source TEXT,
    original_api_id TEXT,
    added_during_onboarding BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure user_profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    display_name TEXT,
    avatar_url TEXT,
    contact_sync_enabled BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints (these will fail gracefully if they already exist)
DO $$
BEGIN
    -- Add foreign key from bookmarks to posts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookmarks_post_id_fkey'
    ) THEN
        ALTER TABLE public.bookmarks 
        ADD CONSTRAINT bookmarks_post_id_fkey 
        FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;
    
    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON public.bookmarks(created_at);
    
    CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at);
    
    CREATE INDEX IF NOT EXISTS idx_user_media_preferences_user_id ON public.user_media_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
    
    RAISE NOTICE '✅ Tables and indexes created successfully';
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '⚠️  Some constraints may already exist: %', SQLERRM;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.user_media_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic ones - you may need to customize these)
DO $$
BEGIN
    -- Bookmarks policies
    DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.bookmarks;
    CREATE POLICY "Users can manage their own bookmarks" ON public.bookmarks
        FOR ALL USING (auth.uid() = user_id);
    
    -- Posts policies (basic read access)
    DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
    CREATE POLICY "Posts are viewable by everyone" ON public.posts
        FOR SELECT USING (true);
        
    DROP POLICY IF EXISTS "Users can manage their own posts" ON public.posts;
    CREATE POLICY "Users can manage their own posts" ON public.posts
        FOR ALL USING (auth.uid() = author_id);
    
    -- User media preferences policies
    DROP POLICY IF EXISTS "Users can manage their own media preferences" ON public.user_media_preferences;
    CREATE POLICY "Users can manage their own media preferences" ON public.user_media_preferences
        FOR ALL USING (auth.uid() = user_id);
    
    -- User profiles policies
    DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.user_profiles;
    CREATE POLICY "Users can view and update their own profile" ON public.user_profiles
        FOR ALL USING (auth.uid() = id);
    
    RAISE NOTICE '✅ RLS policies created successfully';
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '⚠️  Some policies may already exist: %', SQLERRM;
END $$;

-- Create the test user profile
DO $$
BEGIN
    INSERT INTO public.user_profiles (
        id, 
        display_name, 
        avatar_url, 
        contact_sync_enabled, 
        onboarding_completed, 
        username,
        created_at, 
        updated_at
    ) VALUES (
        '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
        'Test User',
        'https://example.com/avatar.jpg',
        false,
        false,
        'testuser',
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Test user profile created/updated successfully';
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ Error creating test user profile: %', SQLERRM;
END $$;

-- Create some sample data for testing
DO $$
DECLARE
    sample_post_id UUID;
BEGIN
    -- Create a sample post
    INSERT INTO public.posts (
        id,
        title,
        content,
        author_id,
        created_at
    ) VALUES (
        uuid_generate_v4(),
        'Sample Post for Testing',
        'This is a sample post to test the bookmark functionality.',
        '8d1f8a3d-ec8d-488d-ab2c-4b538a52adb3'::UUID,
        NOW()
    ) RETURNING id INTO sample_post_id;
    
    RAISE NOTICE '✅ Sample post created with ID: %', sample_post_id;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '⚠️  Sample data creation issue: %', SQLERRM;
END $$;

-- Final status
SELECT 
    '🎉 SCHEMA CREATION COMPLETE' as status,
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name)
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as table_status
FROM (
    VALUES 
        ('user_profiles'),
        ('bookmarks'), 
        ('posts'),
        ('user_media_preferences')
) AS t(table_name); 