-- ============================================================
-- Hiraya Phase 1: Foundation Schema
-- ============================================================

-- ---------- Categories lookup table ----------
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  exam_weight float NOT NULL DEFAULT 0.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'teacher')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Questions ----------
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text text NOT NULL,
  image_url text,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
  category_id uuid NOT NULL REFERENCES public.categories(id),
  exam_source text NOT NULL,
  difficulty float NOT NULL DEFAULT 0.0,
  discrimination float NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Classes ----------
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  join_code text UNIQUE NOT NULL,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Class Members ----------
CREATE TABLE public.class_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- ---------- Assignments ----------
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('study', 'exam')),
  category_ids uuid[],
  question_ids uuid[],
  question_count int NOT NULL,
  time_limit_minutes int,
  deadline timestamptz,
  max_attempts int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Sessions ----------
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  mode text NOT NULL CHECK (mode IN ('study', 'exam')),
  assignment_id uuid REFERENCES public.assignments(id),
  category_ids uuid[],
  time_limit_minutes int,
  question_count int NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  correct_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Responses ----------
CREATE TABLE public.responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id),
  selected_answer text CHECK (selected_answer IN ('a', 'b', 'c', 'd')),
  is_correct boolean NOT NULL,
  time_spent_ms int NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Student Ability (IRT) ----------
CREATE TABLE public.student_ability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  category_id uuid NOT NULL REFERENCES public.categories(id),
  theta float NOT NULL DEFAULT 0.0,
  questions_seen int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, category_id)
);

-- ---------- Review Schedule (Spaced Repetition) ----------
CREATE TABLE public.review_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  question_id uuid NOT NULL REFERENCES public.questions(id),
  next_review_at timestamptz NOT NULL,
  interval_days float NOT NULL DEFAULT 1.0,
  ease_factor float NOT NULL DEFAULT 2.5,
  repetitions int NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  UNIQUE(student_id, question_id)
);

-- ---------- Streaks ----------
CREATE TABLE public.streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id),
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_active_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(student_id)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_review_schedule_student_next ON public.review_schedule(student_id, next_review_at);
CREATE INDEX idx_responses_session ON public.responses(session_id);
CREATE INDEX idx_sessions_student_started ON public.sessions(student_id, started_at DESC);
CREATE INDEX idx_class_members_student ON public.class_members(student_id, class_id);
CREATE INDEX idx_questions_category ON public.questions(category_id);
CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);
CREATE INDEX idx_assignments_class ON public.assignments(class_id);
CREATE INDEX idx_student_ability_student ON public.student_ability(student_id);

-- ============================================================
-- Triggers: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_classes_updated
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_assignments_updated
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_sessions_updated
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_student_ability_updated
  BEFORE UPDATE ON public.student_ability
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Function: set role in JWT custom claims
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Grant necessary permissions for the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ============================================================
-- Helper function: is teacher of student
-- ============================================================

CREATE OR REPLACE FUNCTION auth.is_teacher_of(target_student_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members cm
    JOIN public.classes c ON c.id = cm.class_id
    WHERE cm.student_id = target_student_id
    AND c.teacher_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_ability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- categories (read-only for all authenticated)
CREATE POLICY "Authenticated users can read categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

-- questions (read-only for all authenticated)
CREATE POLICY "Authenticated users can read questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (true);

-- classes
CREATE POLICY "Teachers can read own classes"
  ON public.classes FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can read classes they belong to"
  ON public.classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members
      WHERE class_id = classes.id AND student_id = auth.uid()
    )
  );

-- Note: Students look up classes by join_code via a server action that uses
-- the service role key (bypasses RLS). No blanket SELECT for students needed.

CREATE POLICY "Teachers can create classes"
  ON public.classes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own classes"
  ON public.classes FOR UPDATE
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own classes"
  ON public.classes FOR DELETE
  USING (auth.uid() = teacher_id);

-- class_members
CREATE POLICY "Teachers can read members of own classes"
  ON public.class_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_members.class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read own memberships"
  ON public.class_members FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can join classes"
  ON public.class_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can remove from own classes"
  ON public.class_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_members.class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can leave classes"
  ON public.class_members FOR DELETE
  USING (auth.uid() = student_id);

-- sessions
CREATE POLICY "Students can read own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can read sessions of their students"
  ON public.sessions FOR SELECT
  USING (auth.is_teacher_of(student_id));

CREATE POLICY "Students can create own sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- responses
CREATE POLICY "Students can read own responses"
  ON public.responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE id = responses.session_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can read responses of their students"
  ON public.responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE id = responses.session_id AND auth.is_teacher_of(sessions.student_id)
    )
  );

CREATE POLICY "Students can create responses for own sessions"
  ON public.responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE id = responses.session_id AND student_id = auth.uid()
    )
  );

-- student_ability
CREATE POLICY "Students can read own ability"
  ON public.student_ability FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can read ability of their students"
  ON public.student_ability FOR SELECT
  USING (auth.is_teacher_of(student_id));

-- Note: INSERT/UPDATE on student_ability is done via server actions
-- using the service role key, bypassing RLS.

-- review_schedule
CREATE POLICY "Students can read own review schedule"
  ON public.review_schedule FOR SELECT
  USING (auth.uid() = student_id);

-- Note: INSERT/UPDATE on review_schedule is done via server actions
-- using the service role key, bypassing RLS.

-- assignments
CREATE POLICY "Teachers can read own class assignments"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = assignments.class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read assignments for their classes"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_members
      WHERE class_id = assignments.class_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create assignments for own classes"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = assignments.class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update own assignments"
  ON public.assignments FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers can delete own assignments"
  ON public.assignments FOR DELETE
  USING (auth.uid() = created_by);

-- streaks
CREATE POLICY "Students can read own streaks"
  ON public.streaks FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can read streaks of their students"
  ON public.streaks FOR SELECT
  USING (auth.is_teacher_of(student_id));

-- Note: INSERT/UPDATE on streaks is done via server actions
-- using the service role key, bypassing RLS.
