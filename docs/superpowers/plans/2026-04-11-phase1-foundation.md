# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Next.js project with Supabase auth, database schema, Golden Hour design system, and role-based routing — the foundation everything else builds on.

**Architecture:** Monolithic Next.js 15 (App Router) with Supabase for auth and PostgreSQL. Route groups `(auth)`, `(student)`, `(teacher)` provide role-based layouts. Middleware reads role from JWT claims for route protection. RLS policies enforce data access at the database level.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS 4, Supabase (Auth + PostgreSQL), Zod

**Spec Reference:** `docs/superpowers/specs/2026-04-11-hiraya-mvp-design.md`
**Design Reference:** `docs/design.md`
**Coding Standards:** `docs/coding-standards.md`

---

## File Structure

```
hiraya/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    — root layout: fonts, Tailwind, metadata
│   │   ├── page.tsx                      — root redirect based on auth/role
│   │   ├── middleware.ts                 — auth + role-based route protection
│   │   │
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                — centered card layout for auth pages
│   │   │   ├── error.tsx                 — auth error boundary
│   │   │   ├── actions.ts                — server actions (logout)
│   │   │   ├── login/page.tsx            — login form
│   │   │   └── register/page.tsx         — registration form with role selection
│   │   │
│   │   ├── (student)/
│   │   │   ├── layout.tsx                — student shell: sidebar + header + role guard
│   │   │   ├── error.tsx                 — student error boundary
│   │   │   └── dashboard/
│   │   │       ├── page.tsx              — placeholder dashboard
│   │   │       └── loading.tsx           — loading skeleton
│   │   │
│   │   └── (teacher)/
│   │       ├── layout.tsx                — teacher shell: sidebar + header + role guard
│   │       ├── error.tsx                 — teacher error boundary
│   │       └── dashboard/
│   │           ├── page.tsx              — placeholder dashboard
│   │           └── loading.tsx           — loading skeleton
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx                — Button component with variants
│   │   │   ├── card.tsx                  — Card component
│   │   │   ├── input.tsx                 — Input component
│   │   │   ├── select.tsx                — Select dropdown component
│   │   │   └── toast.tsx                 — Toast notification component
│   │   └── layout/
│   │       ├── sidebar.tsx               — Sidebar navigation
│   │       ├── header.tsx                — Top header with user info
│   │       └── nav-link.tsx              — Active-state nav link
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 — browser Supabase client
│   │   │   ├── server.ts                 — server-side Supabase client
│   │   │   └── middleware.ts             — Supabase middleware helpers
│   │   ├── env.ts                        — Zod-validated environment variables
│   │   ├── auth.ts                       — auth helper (getUserRole type guard)
│   │   └── validations/
│   │       └── auth.ts                   — Zod schemas for login/register forms
│   │
│   └── types/
│       └── database.ts                   — Supabase generated types
│
├── supabase/
│   ├── migrations/
│   │   └── 00001_initial_schema.sql      — all tables, indexes, RLS, triggers
│   └── seed.sql                          — category seed data
│
├── next.config.ts
├── tsconfig.json
├── package.json
└── .env.local.example                    — env var template
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.env.local.example`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

Expected: Project scaffolded with `src/app/layout.tsx`, `src/app/page.tsx`, `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`.

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install -D supabase
```

Expected: Packages added to `package.json`.

- [ ] **Step 3: Enable strict TypeScript**

Edit `tsconfig.json` — ensure `strict: true` is set (should be by default from create-next-app). Verify these compiler options:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Delete tailwind.config.ts (Tailwind v4 uses CSS-only config)**

Run:
```bash
rm tailwind.config.ts
```

Tailwind v4 does not use a JS config file. All theme tokens are defined in `@theme` in `globals.css`.

- [ ] **Step 5: Create .env.local.example**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 6: Set up root layout with fonts**

Edit `src/app/layout.tsx`:

```typescript
import { Inter, Nunito } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata = {
  title: "Hiraya — Aral hanggang pasa",
  description:
    "A friendly, adaptive PhilNITS exam reviewer that tracks your progress and helps you prepare with confidence.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${nunito.variable}`}>
      <body className="bg-background font-body text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Update global CSS**

Edit `src/app/globals.css` (replace all contents):

```css
@import "tailwindcss";

@theme {
  --color-primary: #F5A623;
  --color-secondary: #FF8A65;
  --color-background: #FFF8F0;
  --color-surface: #FFF3E6;
  --color-accent: #C67A1A;
  --color-success: #4CAF50;
  --color-danger: #E85D3A;
  --color-text-primary: #3D2C1E;
  --color-text-secondary: #7A6555;

  --font-heading: var(--font-nunito), sans-serif;
  --font-body: var(--font-inter), sans-serif;

  --shadow-warm: 0 2px 8px rgba(61, 44, 30, 0.08);
  --shadow-warm-lg: 0 4px 16px rgba(61, 44, 30, 0.12);
}
```

This is the **single source of truth** for all Golden Hour design tokens. No `tailwind.config.ts` needed — Tailwind v4 reads `@theme` directly from CSS.

- [ ] **Step 8: Create a temporary root page**

Edit `src/app/page.tsx`:

```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-4xl font-bold text-text-primary">
          Hiraya
        </h1>
        <p className="mt-2 font-body text-lg text-text-secondary">
          Aral hanggang pasa
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 9: Verify dev server runs**

Run:
```bash
npm run dev
```

Expected: Dev server starts on `http://localhost:3000`. Page shows "Hiraya" heading with "Aral hanggang pasa" subtext, warm off-white background, Nunito heading font, Inter body font, warm brown text colors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts .env.local.example src/app/layout.tsx src/app/page.tsx src/app/globals.css next-env.d.ts eslint.config.mjs
git commit -m "scaffold next.js project with golden hour theme"
```

---

## Task 2: Supabase Client Setup

**Files:**
- Create: `src/lib/env.ts`, `src/lib/auth.ts`
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- Create: `src/types/database.ts`

- [ ] **Step 1: Create environment variable validation**

Create `src/lib/env.ts`:

```typescript
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

function validateEnv(): z.infer<typeof envSchema> {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    console.error("[env] invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Missing or invalid environment variables. Check .env.local");
  }

  return parsed.data;
}

export const env = validateEnv();
```

- [ ] **Step 2: Create auth helper with type guard**

Create `src/lib/auth.ts`:

```typescript
import type { User } from "@supabase/supabase-js";

export function getUserRole(user: User): "student" | "teacher" | undefined {
  const role: unknown = user.app_metadata?.role;
  if (role === "student" || role === "teacher") {
    return role;
  }
  return undefined;
}
```

- [ ] **Step 3: Create Supabase browser client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

import type { Database } from "@/types/database";

export function createClient(): ReturnType<typeof createBrowserClient<Database>> {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
```

- [ ] **Step 4: Create Supabase server client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

import type { Database } from "@/types/database";

export async function createClient(): Promise<ReturnType<typeof createServerClient<Database>>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if middleware refreshes user sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 5: Create Supabase middleware helper**

Create `src/lib/supabase/middleware.ts`:

Middleware handles **auth session refresh and auth-only route protection**. It does NOT handle role-based route protection because route groups `(student)` and `(teacher)` share the same URL paths (e.g., both use `/dashboard`). Role enforcement is handled by each route group's `layout.tsx` as defense-in-depth.

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(
  request: NextRequest
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Not logged in and not on auth page → redirect to login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in and on auth page → redirect to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

Note: The middleware uses raw `process.env` with `?? ""` fallback instead of the `env` helper because middleware runs in the Edge runtime where Zod validation may add cold-start latency. The env helper is used in all other server-side code.

- [ ] **Step 4: Create placeholder database types**

Create `src/types/database.ts`:

```typescript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "student" | "teacher";
          first_name: string;
          last_name: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: "student" | "teacher";
          first_name: string;
          last_name: string;
          avatar_url?: string | null;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          exam_weight: number;
          created_at: string;
        };
        Insert: {
          name: string;
          display_name: string;
          exam_weight?: number;
        };
        Update: {
          display_name?: string;
          exam_weight?: number;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
```

Note: This is a minimal placeholder. After running migrations and connecting to Supabase, generate the full types with `npx supabase gen types typescript --project-id <project-id> > src/types/database.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/env.ts src/lib/auth.ts src/lib/supabase/ src/types/database.ts
git commit -m "add supabase client, server, middleware, env validation, and auth helpers"
```

---

## Task 3: Database Schema Migration

**Files:**
- Create: `supabase/migrations/00001_initial_schema.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create initial schema migration**

Create `supabase/migrations/00001_initial_schema.sql`:

```sql
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
$$ LANGUAGE sql SECURITY DEFINER STABLE;

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
```

- [ ] **Step 2: Create category seed data**

Create `supabase/seed.sql`:

```sql
-- Seed categories based on PhilNITS FE exam structure
-- Weights approximate the real exam question distribution

INSERT INTO public.categories (name, display_name, exam_weight) VALUES
  ('technology', 'Technology', 0.15),
  ('management', 'Management', 0.10),
  ('strategy', 'Strategy', 0.10),
  ('hardware', 'Hardware', 0.08),
  ('software', 'Software', 0.10),
  ('database', 'Database', 0.08),
  ('networking', 'Networking', 0.08),
  ('security', 'Security', 0.06),
  ('algorithms', 'Algorithms & Data Structures', 0.10),
  ('system-development', 'System Development', 0.08),
  ('project-management', 'Project Management', 0.07)
ON CONFLICT (name) DO NOTHING;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "add database schema migration with RLS policies and seed data"
```

---

## Task 4: Auth Validation Schemas

**Files:**
- Create: `src/lib/validations/auth.ts`

- [ ] **Step 1: Create Zod schemas for auth forms**

Create `src/lib/validations/auth.ts`:

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  role: z.enum(["student", "teacher"], {
    required_error: "Please select a role",
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/auth.ts
git commit -m "add zod validation schemas for auth forms"
```

---

## Task 5: Shared UI Components

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/toast.tsx`

- [ ] **Step 1: Create Button component**

Create `src/components/ui/button.tsx`:

```typescript
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 focus-visible:ring-accent",
  secondary:
    "border-2 border-accent text-accent hover:bg-accent/10 focus-visible:ring-accent",
  danger:
    "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger",
  ghost:
    "text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:ring-accent",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-xl font-heading font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
```

- [ ] **Step 2: Create Card component**

Create `src/components/ui/card.tsx`:

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={`rounded-xl bg-surface shadow-warm ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create Input component**

Create `src/components/ui/input.tsx`:

```typescript
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, id, className = "", ...props }, ref) {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`rounded-xl border-2 border-surface bg-white px-4 py-2.5 text-text-primary placeholder:text-text-secondary/50 transition-colors focus:border-accent focus:outline-none ${
            error ? "border-danger" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
);
```

- [ ] **Step 4: Create Select component**

Create `src/components/ui/select.tsx`:

```typescript
import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, options, id, className = "", ...props }, ref) {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`rounded-xl border-2 border-surface bg-white px-4 py-2.5 text-text-primary transition-colors focus:border-accent focus:outline-none ${
            error ? "border-danger" : ""
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
);
```

- [ ] **Step 5: Create Toast component**

Create `src/components/ui/toast.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

const typeStyles: Record<NonNullable<ToastProps["type"]>, string> = {
  success: "border-success bg-success/10 text-success",
  error: "border-danger bg-danger/10 text-danger",
  info: "border-primary bg-primary/10 text-text-primary",
};

export function Toast({
  message,
  type = "info",
  duration = 4000,
  onClose,
}: ToastProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-xl border-2 px-4 py-3 shadow-warm-lg ${typeStyles[type]}`}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
```

- [ ] **Step 6: Verify components compile**

Run:
```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/
git commit -m "add shared ui components: button, card, input, select, toast"
```

---

## Task 6: Layout Components

**Files:**
- Create: `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`, `src/components/layout/nav-link.tsx`

- [ ] **Step 1: Create NavLink component**

Create `src/components/layout/nav-link.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function NavLink({ href, icon, label }: NavLinkProps): React.JSX.Element {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/15 text-accent"
          : "text-text-secondary hover:bg-surface hover:text-text-primary"
      }`}
    >
      <span className="h-5 w-5">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Create Sidebar component**

Create `src/components/layout/sidebar.tsx`:

```typescript
"use client";

import { NavLink } from "@/components/layout/nav-link";

interface SidebarProps {
  role: "student" | "teacher";
}

const studentLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/practice", label: "Practice", icon: "📝" },
  { href: "/assignments", label: "Assignments", icon: "📋" },
  { href: "/classes/join", label: "Join Class", icon: "🏫" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/classes", label: "Classes", icon: "🏫" },
  { href: "/assignments", label: "Assignments", icon: "📋" },
  { href: "/questions", label: "Question Bank", icon: "📚" },
];

export function Sidebar({ role }: SidebarProps): React.JSX.Element {
  const links = role === "student" ? studentLinks : teacherLinks;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-surface bg-white">
      <div className="flex items-center gap-2 px-6 py-5">
        <h1 className="font-heading text-2xl font-bold text-primary">
          Hiraya
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {links.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={<span>{link.icon}</span>}
          />
        ))}
      </nav>

      <div className="border-t border-surface px-6 py-4">
        <p className="text-xs text-text-secondary">Aral hanggang pasa</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create Header component**

Create `src/components/layout/header.tsx`:

```typescript
import Image from "next/image";

import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  displayName: string;
  avatarUrl: string | null;
}

export function Header({ displayName, avatarUrl }: HeaderProps): React.JSX.Element {
  return (
    <header className="flex h-16 items-center justify-between border-b border-surface bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-text-primary">
          {displayName}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-accent">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/
git commit -m "add layout components: sidebar, header, nav-link"
```

---

## Task 7: Auth Pages

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/error.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`
- Create: `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Create auth layout**

Create `src/app/(auth)/layout.tsx`:

```typescript
interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl font-bold text-primary">
            Hiraya
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Aral hanggang pasa
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create auth error boundary**

Create `src/app/(auth)/error.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AuthErrorProps {
  error: Error;
  reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  return (
    <Card>
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-danger">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <Button onClick={reset} className="mt-4">
          Try again
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }

    console.info("[auth] user logged in", { email: result.data.email });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Log in
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Welcome back! Enter your credentials to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="current-password"
        />

        {submitError && (
          <p className="text-sm text-danger">{submitError}</p>
        )}

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
```

- [ ] **Step 4: Create register page**

Create `src/app/(auth)/register/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { RegisterInput } from "@/lib/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterInput>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "student",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError(null);
  }

  function handleRoleSelect(role: "student" | "teacher"): void {
    setFormData((prev) => ({ ...prev, role }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof RegisterInput;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          first_name: result.data.firstName,
          last_name: result.data.lastName,
          role: result.data.role,
        },
      },
    });

    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }

    console.info("[auth] user registered", {
      email: result.data.email,
      role: result.data.role,
    });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Create an account
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Join Hiraya and start preparing for PhilNITS.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">
            I am a...
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleRoleSelect("student")}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                formData.role === "student"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-surface text-text-secondary hover:border-accent/30"
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("teacher")}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
                formData.role === "teacher"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-surface text-text-secondary hover:border-accent/30"
              }`}
            >
              Teacher
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            name="firstName"
            placeholder="Juan"
            value={formData.firstName}
            onChange={handleChange}
            error={errors.firstName}
            autoComplete="given-name"
          />
          <Input
            label="Last name"
            name="lastName"
            placeholder="Dela Cruz"
            value={formData.lastName}
            onChange={handleChange}
            error={errors.lastName}
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          autoComplete="new-password"
        />

        {submitError && (
          <p className="text-sm text-danger">{submitError}</p>
        )}

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Creating account..." : "Sign up"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
```

- [ ] **Step 5: Create logout server action**

Create `src/app/(auth)/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function logout(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  console.info("[auth] user logged out");
  redirect("/login");
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(auth)/
git commit -m "add auth pages: login, register, logout action"
```

---

## Task 8: Middleware & Root Redirect

**Files:**
- Create: `src/middleware.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create middleware**

Create `src/middleware.ts`:

```typescript
import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Update root page to redirect**

Edit `src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/dashboard");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts src/app/page.tsx
git commit -m "add auth middleware and root redirect"
```

---

## Task 9: Role-Based Route Group Layouts

**Files:**
- Create: `src/app/(student)/layout.tsx`, `src/app/(student)/error.tsx`
- Create: `src/app/(student)/dashboard/page.tsx`, `src/app/(student)/dashboard/loading.tsx`
- Create: `src/app/(teacher)/layout.tsx`, `src/app/(teacher)/error.tsx`
- Create: `src/app/(teacher)/dashboard/page.tsx`, `src/app/(teacher)/dashboard/loading.tsx`

- [ ] **Step 1: Create student layout with role guard**

Create `src/app/(student)/layout.tsx`:

```typescript
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default async function StudentLayout({ children }: StudentLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = getUserRole(user);
  if (role !== "student") {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="student" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          displayName={profile?.display_name ?? "Student"}
          avatarUrl={profile?.avatar_url ?? null}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create student error boundary**

Create `src/app/(student)/error.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface StudentErrorProps {
  error: Error;
  reset: () => void;
}

export default function StudentError({ error, reset }: StudentErrorProps) {
  console.error("[student] route error", { message: error.message });

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <h2 className="font-heading text-xl font-bold text-danger">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <Button onClick={reset} className="mt-4">
          Try again
        </Button>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create student dashboard placeholder**

Create `src/app/(student)/dashboard/page.tsx`:

```typescript
import { Card } from "@/components/ui/card";

export default function StudentDashboard() {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Dashboard
      </h2>
      <p className="mt-1 text-text-secondary">
        Welcome to Hiraya! Your progress will appear here.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-text-secondary">Questions Answered</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Accuracy</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            —
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Current Streak</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0 days
          </p>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create student dashboard loading state**

Create `src/app/(student)/dashboard/loading.tsx`:

```typescript
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="mt-2 h-5 w-72 animate-pulse rounded-lg bg-surface" />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="h-4 w-24 animate-pulse rounded bg-background" />
            <div className="mt-3 h-9 w-16 animate-pulse rounded bg-background" />
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create teacher layout with role guard**

Create `src/app/(teacher)/layout.tsx`:

```typescript
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export default async function TeacherLayout({ children }: TeacherLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = getUserRole(user);
  if (role !== "teacher") {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role="teacher" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          displayName={profile?.display_name ?? "Teacher"}
          avatarUrl={profile?.avatar_url ?? null}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create teacher error boundary**

Create `src/app/(teacher)/error.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TeacherErrorProps {
  error: Error;
  reset: () => void;
}

export default function TeacherError({ error, reset }: TeacherErrorProps) {
  console.error("[teacher] route error", { message: error.message });

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="max-w-md text-center">
        <h2 className="font-heading text-xl font-bold text-danger">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{error.message}</p>
        <Button onClick={reset} className="mt-4">
          Try again
        </Button>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Create teacher dashboard placeholder**

Create `src/app/(teacher)/dashboard/page.tsx`:

```typescript
import { Card } from "@/components/ui/card";

export default function TeacherDashboard() {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Dashboard
      </h2>
      <p className="mt-1 text-text-secondary">
        Manage your classes and track student progress.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-text-secondary">Total Classes</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Total Students</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Active Assignments</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0
          </p>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create teacher dashboard loading state**

Create `src/app/(teacher)/dashboard/loading.tsx`:

```typescript
import { Card } from "@/components/ui/card";

export default function TeacherDashboardLoading() {
  return (
    <div>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="mt-2 h-5 w-72 animate-pulse rounded-lg bg-surface" />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="h-4 w-24 animate-pulse rounded bg-background" />
            <div className="mt-3 h-9 w-16 animate-pulse rounded bg-background" />
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Verify the build compiles**

Run:
```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. All route groups, layouts, pages, and error boundaries compile.

- [ ] **Step 10: Commit**

```bash
git add src/app/(student)/ src/app/(teacher)/
git commit -m "add role-based route groups with layouts, dashboards, and error boundaries"
```

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Set up local Supabase (or connect to hosted)**

If using hosted Supabase:
- Create a Supabase project at https://supabase.com
- Copy the project URL and anon key to `.env.local`
- Run the migration SQL in the Supabase SQL editor
- Run the seed SQL in the Supabase SQL editor
- Enable the custom JWT hook: Go to Authentication → Hooks → Add hook → select `custom_access_token_hook`

If using local Supabase CLI:
```bash
npx supabase init
npx supabase start
npx supabase db reset
```

- [ ] **Step 2: Create .env.local with real credentials**

```bash
cp .env.local.example .env.local
# Edit .env.local with your actual Supabase URL and anon key
```

- [ ] **Step 3: Start dev server and test auth flow**

Run:
```bash
npm run dev
```

Test the following flow:
1. Visit `http://localhost:3000` → should redirect to `/login`
2. Click "Sign up" → navigate to `/register`
3. Fill out registration as student → submit → should redirect to `/dashboard` with student sidebar
4. Log out → should redirect to `/login`
5. Register as teacher → submit → should redirect to `/dashboard` with teacher sidebar
6. As teacher, try navigating to a student route → should redirect back to dashboard
7. Verify Golden Hour theme: warm off-white background, cream cards, Nunito headings, Inter body text, amber buttons

- [ ] **Step 4: Configure next.config.ts for Supabase images**

Edit `next.config.ts` to allow avatar images from Supabase storage:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Generate Supabase types**

Run:
```bash
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
```

Replace `<your-project-id>` with your actual project ID. This generates the full type definitions from your live schema, replacing the placeholder types.

- [ ] **Step 6: Verify build with generated types**

Run:
```bash
npm run build
```

Expected: Build succeeds. If there are type mismatches between the generated types and the code, fix them.

- [ ] **Step 7: Final commit**

```bash
git add src/types/database.ts next.config.ts .env.local.example
git commit -m "generate supabase types, configure images, and verify end-to-end auth flow"
```

---

## Summary

Phase 1 delivers:
- Next.js 15 project with TypeScript strict mode and Golden Hour Tailwind theme
- Supabase integration (browser client, server client, middleware)
- Complete database schema (11 tables, indexes, triggers, RLS policies)
- Category seed data for PhilNITS exam structure
- Auth flow (register with role selection, login, logout)
- JWT custom claims for role-based routing (no DB query per request)
- Role-based route groups with layouts, sidebars, headers
- Middleware route protection + layout-level defense-in-depth
- Shared UI components (Button, Card, Input, Toast)
- Layout components (Sidebar, Header, NavLink)
- Placeholder dashboards for both student and teacher roles
- Error boundaries and loading states

**Next phase:** Phase 2 (Core Practice) builds the exam reviewer, adaptive engine, and question flow on top of this foundation.
