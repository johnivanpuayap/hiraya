-- ============================================================
-- Hiraya Phase 3a: Learn / Lessons schema
-- ============================================================

-- ---------- Lessons (registry synced from filesystem) ----------
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  order_index int NOT NULL,
  estimated_minutes int,
  content_hash text NOT NULL,
  quiz_hash text NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lessons_category_order_idx
  ON public.lessons (category_id, order_index)
  WHERE deleted_at IS NULL;

-- ---------- Lesson reads ----------
CREATE TABLE public.lesson_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE RESTRICT,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- ---------- Lesson quiz attempts ----------
CREATE TABLE public.lesson_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE RESTRICT,
  correct_count int NOT NULL CHECK (correct_count >= 0),
  total_count int NOT NULL CHECK (total_count > 0),
  passed boolean NOT NULL,
  answers jsonb NOT NULL,
  content_hash_at_attempt text NOT NULL,
  quiz_hash_at_attempt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (correct_count <= total_count)
);

CREATE INDEX lesson_quiz_attempts_user_lesson_best_idx
  ON public.lesson_quiz_attempts (user_id, lesson_id, correct_count DESC, total_count);

CREATE INDEX lesson_quiz_attempts_user_lesson_recent_idx
  ON public.lesson_quiz_attempts (user_id, lesson_id, created_at DESC);

-- ---------- RLS ----------

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- lessons: any authenticated user can read; only service role writes
CREATE POLICY "Authenticated users can read lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies defined -> writes blocked for all non-service-role clients.

-- lesson_reads: students manage their own rows
CREATE POLICY "Users can read own lesson_reads"
  ON public.lesson_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own lesson_reads"
  ON public.lesson_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own lesson_reads"
  ON public.lesson_reads FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- lesson_quiz_attempts: users can read own rows; writes only via service role (server action)
CREATE POLICY "Users can read own quiz attempts"
  ON public.lesson_quiz_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies -> writes blocked for all non-service-role clients.
