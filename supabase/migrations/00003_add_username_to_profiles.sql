-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- RPC to resolve a username to an email (for login)
CREATE OR REPLACE FUNCTION public.get_email_by_username(lookup_username text)
RETURNS text AS $$
  SELECT u.email
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE p.username = lookup_username
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Update trigger to populate username from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  user_role := NEW.raw_user_meta_data->>'role';

  -- Only set role if it's a valid value, otherwise leave NULL (OAuth users)
  IF user_role IS NOT NULL AND user_role NOT IN ('student', 'teacher') THEN
    user_role := NULL;
  END IF;

  INSERT INTO public.profiles (id, role, first_name, last_name, username)
  VALUES (
    NEW.id,
    user_role,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'given_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      ''
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'family_name', ''),
      ''
    ),
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
