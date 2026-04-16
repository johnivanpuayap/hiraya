-- Allow NULL role for OAuth users who haven't selected a role yet
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IS NULL OR role IN ('student', 'teacher'));

-- Update trigger to set role as NULL when not provided (OAuth signup)
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

  INSERT INTO public.profiles (id, role, first_name, last_name)
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
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
