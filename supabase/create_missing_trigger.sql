-- Create the missing handle_new_user trigger
-- This automatically creates user profiles when new users sign up

-- First, create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email_hash,
    username,
    display_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'email_hash', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test: Create a profile for the existing user who doesn't have one
INSERT INTO public.user_profiles (
  id,
  email_hash,
  username,
  display_name,
  created_at,
  updated_at
)
VALUES (
  'b41990da-1bfd-4416-918a-a18b1df2b6cf',
  'cea927303c03a03d2cf20b8bfd690ce2cd00537701bfc6c446f1c4d4a85826c6',
  'normal_guy_',
  'Normal Guy',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify the profile was created
SELECT id, username, display_name, created_at 
FROM user_profiles 
WHERE id = 'b41990da-1bfd-4416-918a-a18b1df2b6cf'; 