-- Fix infinite recursion between classes and class_members RLS policies.
-- The "Students can read classes they belong to" policy on classes checks class_members,
-- and "Teachers can read members of own classes" on class_members checks classes,
-- causing circular evaluation.

-- Fix: replace the teacher class_members SELECT policy to check teacher_id
-- on the classes table using a subquery that bypasses RLS via security definer function.

CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id uuid, p_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND teacher_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';

-- Drop and recreate the problematic policies
DROP POLICY IF EXISTS "Teachers can read members of own classes" ON public.class_members;
CREATE POLICY "Teachers can read members of own classes"
  ON public.class_members FOR SELECT
  USING (public.is_class_teacher(class_id, auth.uid()));

DROP POLICY IF EXISTS "Teachers can remove from own classes" ON public.class_members;
CREATE POLICY "Teachers can remove from own classes"
  ON public.class_members FOR DELETE
  USING (public.is_class_teacher(class_id, auth.uid()));
