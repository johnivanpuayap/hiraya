# Hiraya MVP — Design Specification

## Overview

**Name:** Hiraya
**Tagline:** "Aral hanggang pasa" (Study until you pass)
**What:** A friendly, adaptive PhilNITS exam reviewer that tracks student progress and helps them prepare with confidence.
**Origin:** From "Hiraya Manawari" — an ancient Filipino phrase meaning "may the wishes of your heart be granted."

**MVP Scope:** User accounts, exam reviewer (study + exam modes), adaptive learning engine, full analytics dashboard, teacher tools with class management and custom exam building, read-only question bank seeded from past PhilNITS exams.

**Deferred (post-MVP):** Landing/marketing page, leaderboards/social features, editable question bank, AI-powered explanations, IRT parameter calibration pipeline, email verification, password reset flow.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 15 (App Router) | Fullstack React with Server Components |
| Language | TypeScript (strict mode) | Type safety across the codebase |
| Styling | Tailwind CSS | Utility-first CSS with Golden Hour design tokens |
| Auth | Supabase Auth | Email/password auth with role in JWT claims |
| Database | Supabase PostgreSQL | Managed Postgres with RLS |
| Validation | Zod | Runtime validation at system boundaries |
| Deployment | Vercel + Supabase | Free tier for both |

**Architecture:** Monolithic Next.js — all UI, API routes, server actions, and adaptive engine logic in one codebase. No separate backend service.

---

## User Roles

### Student
- Sign up and log in with email/password
- Choose practice mode: Study (untimed, instant feedback) or Exam (timed simulation)
- Receive adaptively selected questions based on IRT ability + spaced repetition + weak categories
- View full progress dashboard: scores, streaks, mastery per topic, trends, predicted exam readiness
- Join classes via teacher-provided join codes
- Complete teacher-assigned practice sets and exams

### Teacher
- Sign up and log in with email/password
- Create and manage classes with unique join codes
- View class-wide and per-student performance analytics
- Build custom exams by selecting questions from the question bank
- Assign practice sets with optional category filters, question counts, and deadlines
- Browse the question bank (read-only)

---

## Database Schema

### Auth
- `auth.users` — managed by Supabase Auth (email, password, metadata)
- Role stored in JWT custom claims via a Supabase database function hook on `auth.users`. This allows middleware to read the role from the JWT without a database query.

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text, unique | Normalized lowercase (e.g., "data-structures") |
| display_name | text | Human-readable (e.g., "Data Structures") |
| exam_weight | float, default 0.0 | Proportion of questions on real PhilNITS exam (0.0-1.0, sum to 1.0) |
| created_at | timestamptz | |

Lookup table — populated from seed data. All category references in other tables use FK to this table.

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK, FK → auth.users | |
| role | text, CHECK IN ('student', 'teacher') | |
| first_name | text | |
| last_name | text | |
| display_name | text, generated | `first_name \|\| ' ' \|\| last_name` |
| avatar_url | text, nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Auto-created on signup via database trigger. `updated_at` auto-updates via trigger.

### questions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| question_text | text | |
| image_url | text, nullable | |
| option_a | text | |
| option_b | text | |
| option_c | text | |
| option_d | text | |
| correct_answer | text, CHECK IN ('a', 'b', 'c', 'd') | |
| category_id | uuid, FK → categories | |
| exam_source | text | e.g., "2024 April FE" |
| difficulty | float, default 0.0 | IRT difficulty parameter (b) |
| discrimination | float, default 1.0 | IRT discrimination parameter (a) |
| created_at | timestamptz | |

Note: Four fixed option columns are intentional — all PhilNITS questions are 4-option MCQ. Option shuffling is not needed for MVP. If needed later, a mapping layer can be added without schema changes.

Note: With all discrimination values at 1.0 (default), the IRT engine effectively operates as a 1PL Rasch model at launch. This is acceptable for MVP. A calibration pipeline to fit `a` and `b` from collected response data is deferred to post-MVP.

### classes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| name | text | |
| join_code | text, unique | 6-character alphanumeric code |
| teacher_id | uuid, FK → profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### class_members
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| class_id | uuid, FK → classes | |
| student_id | uuid, FK → profiles | |
| joined_at | timestamptz | |
| | UNIQUE(class_id, student_id) | |

### sessions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| student_id | uuid, FK → profiles | |
| mode | text, CHECK IN ('study', 'exam') | |
| assignment_id | uuid, FK → assignments, nullable | null = self-initiated practice |
| category_ids | uuid[], nullable | FK references to categories |
| time_limit_minutes | int, nullable | For self-initiated exam mode; copied from assignment if applicable |
| question_count | int | Target number of questions |
| started_at | timestamptz | |
| completed_at | timestamptz, nullable | |
| correct_count | int, default 0 | |
| updated_at | timestamptz | |

Score is derived: `correct_count / question_count`. Not stored separately to avoid inconsistency.

For study mode, `question_count` is set at session start (student chooses) but the student can quit early. `completed_at` is set when student finishes or quits. Actual questions answered = count of `responses` for this session.

### responses
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| session_id | uuid, FK → sessions | |
| question_id | uuid, FK → questions | |
| selected_answer | text, CHECK IN ('a', 'b', 'c', 'd'), nullable | null = skipped |
| is_correct | boolean | |
| time_spent_ms | int | Per-question timing |
| answered_at | timestamptz | |

### student_ability
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| student_id | uuid, FK → profiles | |
| category_id | uuid, FK → categories | |
| theta | float, default 0.0 | IRT ability estimate, clamped to [-4.0, 4.0] |
| questions_seen | int, default 0 | |
| correct_count | int, default 0 | |
| updated_at | timestamptz | |
| | UNIQUE(student_id, category_id) | |

### review_schedule
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| student_id | uuid, FK → profiles | |
| question_id | uuid, FK → questions | |
| next_review_at | timestamptz | |
| interval_days | float, default 1.0 | |
| ease_factor | float, default 2.5 | |
| repetitions | int, default 0 | |
| last_reviewed_at | timestamptz, nullable | |
| | UNIQUE(student_id, question_id) | |

### assignments
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| class_id | uuid, FK → classes | |
| created_by | uuid, FK → profiles | Teacher who created this assignment |
| title | text | |
| mode | text, CHECK IN ('study', 'exam') | |
| category_ids | uuid[], nullable | FK references to categories |
| question_ids | uuid[], nullable | Specific questions (if hand-picked) |
| question_count | int | How many questions to serve |
| time_limit_minutes | int, nullable | null = untimed |
| deadline | timestamptz, nullable | |
| max_attempts | int, default 1 | How many times a student can attempt |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Field interaction rules:**
- If `question_ids` is provided: serve exactly those questions. `question_count` must equal the array length. `category_ids` is ignored.
- If `question_ids` is null: select questions from categories in `category_ids` (or all categories if null). Use adaptive selection up to `question_count`.
- `max_attempts` controls retakes. Teacher dashboard shows all attempts. Student sees their best score.

### streaks
| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | |
| student_id | uuid, FK → profiles | |
| current_streak | int, default 0 | |
| longest_streak | int, default 0 | |
| last_active_date | date | |
| | UNIQUE(student_id) | |

**Activity definition:** A student is "active" for streak purposes when they **complete** a session (i.e., `completed_at` is set). Starting a session without answering any questions does not count.

**Timezone:** Streak dates use Philippine Standard Time (UTC+8). The `last_active_date` is the student's local date in PST.

### Required Indexes

```sql
-- Adaptive engine: overdue reviews (hottest query)
CREATE INDEX idx_review_schedule_student_next ON review_schedule(student_id, next_review_at);

-- Session results and history
CREATE INDEX idx_responses_session ON responses(session_id);
CREATE INDEX idx_sessions_student_started ON sessions(student_id, started_at DESC);

-- Class lookups (both directions)
CREATE INDEX idx_class_members_student ON class_members(student_id, class_id);

-- Question filtering by category
CREATE INDEX idx_questions_category ON questions(category_id);

-- Teacher's classes
CREATE INDEX idx_classes_teacher ON classes(teacher_id);

-- Assignments by class
CREATE INDEX idx_assignments_class ON assignments(class_id);

-- Student ability by student
CREATE INDEX idx_student_ability_student ON student_ability(student_id);
```

### Key Relationships
- `profiles` ← 1:1 → `auth.users` (auto-created on signup)
- `teacher` ← 1:many → `classes` ← many:many → `students` (via class_members)
- `student` ← 1:many → `sessions` ← 1:many → `responses`
- `student × category` ← 1:1 → `student_ability` (IRT tracking)
- `student × question` ← 1:1 → `review_schedule` (spaced repetition)
- `class` ← 1:many → `assignments` → links to `sessions`
- All category references → `categories` lookup table

---

## App Structure & Routes

```
src/
├── app/
│   ├── layout.tsx                — root layout (fonts, Tailwind, Supabase provider)
│   ├── page.tsx                  — redirect based on auth/role
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── layout.tsx            — centered card layout
│   │   └── error.tsx
│   │
│   ├── (student)/
│   │   ├── layout.tsx            — student shell (sidebar, header) + server-side role check
│   │   ├── error.tsx             — student route group error boundary
│   │   ├── dashboard/
│   │   │   ├── page.tsx          — progress, streaks, readiness score
│   │   │   └── loading.tsx
│   │   ├── practice/
│   │   │   ├── page.tsx          — choose mode, category, question count, start
│   │   │   ├── loading.tsx
│   │   │   └── [sessionId]/
│   │   │       ├── page.tsx      — active quiz
│   │   │       ├── error.tsx     — quiz-level error boundary
│   │   │       └── results/page.tsx — score, review, explanations
│   │   ├── assignments/
│   │   │   ├── page.tsx          — teacher-assigned work
│   │   │   └── loading.tsx
│   │   ├── classes/
│   │   │   └── join/page.tsx     — enter join code to join a class
│   │   └── profile/page.tsx
│   │
│   ├── (teacher)/
│   │   ├── layout.tsx            — teacher shell (different sidebar) + server-side role check
│   │   ├── error.tsx             — teacher route group error boundary
│   │   ├── dashboard/
│   │   │   ├── page.tsx          — class overview
│   │   │   └── loading.tsx
│   │   ├── classes/
│   │   │   ├── page.tsx          — list classes
│   │   │   ├── loading.tsx
│   │   │   ├── new/page.tsx      — create class
│   │   │   └── [classId]/
│   │   │       ├── page.tsx      — class detail, roster
│   │   │       └── students/[studentId]/page.tsx
│   │   ├── assignments/
│   │   │   ├── page.tsx          — list assignments
│   │   │   ├── loading.tsx
│   │   │   └── new/page.tsx      — build exam from question bank
│   │   └── questions/page.tsx    — browse question bank
│   │
│   └── api/                      — API routes (if Server Actions insufficient)
│
├── components/
│   ├── ui/                       — Button, Card, Input, Select, Badge, Modal, Toast
│   ├── quiz/                     — QuestionCard, Timer, ProgressBar, AnswerFeedback, QuizNav
│   ├── dashboard/                — StatCard, MasteryChart, TrendGraph, ReadinessGauge, StreakDisplay, WeakTopics, ClassCard, StudentTable, QuestionPicker
│   └── layout/                   — Sidebar, Header, NavLink
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             — browser Supabase client
│   │   ├── server.ts             — server-side Supabase client
│   │   └── middleware.ts         — auth session refresh + role from JWT claims
│   ├── adaptive/
│   │   ├── irt.ts                — EAP ability estimation & question selection
│   │   ├── spaced-repetition.ts  — Modified SM-2 algorithm
│   │   └── engine.ts             — combines IRT + SR + category targeting
│   ├── validations/              — Zod schemas for form inputs and API boundaries
│   └── utils.ts
│
└── types/
    └── database.ts               — auto-generated Supabase types
```

Route groups `(auth)`, `(student)`, `(teacher)` provide separate layouts without URL prefix pollution.

Each route group layout includes a server-side role check as defense-in-depth alongside middleware — prevents layout flash if a student navigates to a teacher URL.

Error boundaries placed at route group level AND at quiz session level (quiz errors should not blow away the entire student shell).

---

## Adaptive Engine

### Layer 1 — IRT (Item Response Theory)

Uses the 2-Parameter Logistic (2PL) model:

- **Student ability (theta):** one value per student per category, starts at 0.0, clamped to [-4.0, 4.0]
- **Question parameters:** `difficulty` (b) and `discrimination` (a) per question
- **Probability model:** `P(correct) = 1 / (1 + e^(-a * (theta - b)))`

**Theta estimation — Expected A Posteriori (EAP):**

EAP is used instead of MLE because MLE fails when a student has fewer than ~5 responses or when all responses are correct/incorrect. EAP adds a standard normal prior (mean=0, sd=1) that regularizes the estimate and always produces a finite result.

- **Update approach:** Stepwise update after each answer rather than re-running full estimation over the entire response history. This avoids fetching the complete response history on every answer.
- After a correct answer: `theta += learning_rate * a * (1 - P(correct))` (theta increases, scaled by surprise)
- After a wrong answer: `theta -= learning_rate * a * P(correct)` (theta decreases, scaled by surprise)
- `learning_rate` starts at 0.4 for the first few questions and decays to 0.1 as `questions_seen` increases, stabilizing the estimate over time.
- Theta is clamped to [-4.0, 4.0] after every update.

**Question selection — Maximum Fisher Information:**

Uses the full Fisher information formula: `I(theta) = a^2 * P(theta) * (1 - P(theta))`. This accounts for both difficulty and discrimination, not just difficulty proximity. A question with high discrimination far from theta can be more informative than one with low discrimination close to theta.

**Exclusion set:** Questions answered in the current session or answered within the last 24 hours are excluded from IRT selection to prevent repetition.

### Layer 2 — Spaced Repetition (Modified SM-2)

Binary-correct mapping to SM-2 quality grades:
- **Wrong** → quality = 1 (complete failure)
- **Correct** → quality = 4 (correct with some hesitation)

**Formulas:**

```
If quality < 3 (wrong answer):
  repetitions = 0
  interval_days = 1.0
  ease_factor = max(1.3, ease_factor - 0.2)

If quality >= 3 (correct answer):
  repetitions += 1
  if repetitions == 1: interval_days = 1.0
  elif repetitions == 2: interval_days = 6.0
  else: interval_days = interval_days * ease_factor
  ease_factor = max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

next_review_at = now + interval_days
```

**First answer behavior:** On a student's first answer to any question, a `review_schedule` entry is created with the above formulas applied (interval=1.0 if wrong, interval=1.0 if first correct, ease_factor=2.5).

**Questions due for review** (`next_review_at < now()`) get top priority in the question queue, ahead of IRT selection.

### Layer 3 — Category Targeting

- Ranks all categories by student's theta (lowest = weakest)
- Within weak categories, applies IRT + spaced repetition to pick the specific question
- Prevents students from only practicing strong categories
- Categories with `questions_seen = 0` are treated as weakest (priority to expose students to all categories)

### Combined Selection Flow (engine.ts)

1. **Overdue reviews first:** Query `review_schedule WHERE student_id = ? AND next_review_at < now()` ordered by most overdue. Serve these questions first.
2. **Weak category targeting:** If no overdue reviews, find student's weakest categories by theta. Categories with `questions_seen = 0` rank as weakest.
3. **IRT selection:** From the targeted category, select the question with maximum Fisher information for the student's current theta. Exclude questions in the current session or answered within 24 hours.
4. **Post-answer updates:** After each answer, update theta (stepwise EAP), upsert review_schedule (modified SM-2), update session correct_count, check and update streaks if session completes.

### Predicted Exam Readiness Score

**Formula:** Weighted average of per-category readiness, mapped via logistic function:

```
per_category_readiness = 100 / (1 + e^(-theta))  // maps theta to 0-100%
overall_readiness = sum(per_category_readiness * category.exam_weight) / sum(exam_weights)
```

- `exam_weight` values are stored in the `categories` table and derived from real PhilNITS exam question distribution
- Categories with `questions_seen = 0` contribute 0% readiness (not the default 50% that theta=0.0 would give). This prevents untouched categories from inflating the score.
- Updates after every session completion
- Displayed on dashboard as "Exam Readiness: X%"

---

## Auth Flow & Route Protection

### Sign Up
1. User picks role (student/teacher) on registration form
2. Supabase Auth creates user → DB trigger auto-creates `profiles` row with role
3. DB function hook writes role into JWT custom claims (app_metadata)
4. Redirect to appropriate dashboard
5. Email verification is disabled for MVP (deferred to post-MVP)

### Login
1. Email + password via Supabase Auth
2. Middleware reads role from JWT claims — no database query needed
3. Redirect: students → student dashboard, teachers → teacher dashboard

### Route Protection

**Middleware (middleware.ts):**
- Runs on every request (excluding static assets via matcher config)
- Reads auth session and role from JWT claims
- No session → redirect to `/login`
- Student hitting `(teacher)` routes → redirect to student dashboard
- Teacher hitting `(student)` routes → redirect to teacher dashboard
- Session refresh handled automatically by Supabase middleware

**Layout-level role check (defense-in-depth):**
- Each route group layout (`(student)/layout.tsx`, `(teacher)/layout.tsx`) performs a server-side role check
- Redirects if role doesn't match, preventing layout flash before middleware kicks in

### Row-Level Security (RLS)

Helper function for teacher-student relationship:
```sql
CREATE FUNCTION auth.is_teacher_of(target_student_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM class_members cm
    JOIN classes c ON c.id = cm.class_id
    WHERE cm.student_id = target_student_id
    AND c.teacher_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Per-table policies:**

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | Own row only | Via trigger only | Own row only | Never |
| categories | All authenticated | None (seed only) | None | None |
| questions | All authenticated | None (seed only) | None | None |
| classes | Teacher: own classes. Student: classes they belong to (via class_members) | Teacher only | Teacher: own classes only | Teacher: own classes only |
| class_members | Teacher: members of own classes. Student: own memberships | Student: join via join_code (validated). Teacher: none (students self-join) | None | Teacher: remove from own classes. Student: leave own memberships |
| sessions | Student: own sessions. Teacher: sessions of students in own classes (via `auth.is_teacher_of`) | Student only | Student: own sessions only | Never |
| responses | Student: own responses. Teacher: responses of students in own classes | Student only | Never (immutable) | Never |
| student_ability | Student: own records. Teacher: records of students in own classes | System only (via server action) | System only | Never |
| review_schedule | Student: own records only | System only | System only | Never |
| assignments | Teacher: own class assignments. Student: assignments for classes they belong to | Teacher: for own classes only (validated via `created_by`) | Teacher: own assignments only | Teacher: own assignments only |
| streaks | Student: own record. Teacher: streaks of students in own classes | System only | System only | Never |

### Class Join Flow
1. Teacher creates class → system generates unique 6-character alphanumeric join code
2. Teacher shares code with students (displayed in class detail page)
3. Student navigates to `/classes/join`, enters the code
4. Server action validates the code, checks the student isn't already a member, adds to `class_members`
5. Student appears in teacher's class roster
6. Students cannot enumerate all classes — they can only look up by join_code

---

## Practice Modes

### Study Mode
- Untimed — no countdown
- Immediate feedback after each answer (correct/wrong + explanation)
- Adaptive question selection active
- Student chooses question count at session start (e.g., 10, 20, 30) — sets `session.question_count`
- Student can quit anytime; partial progress saved (`completed_at` set on quit)
- Actual questions answered = count of responses for the session
- Ideal for learning phase

### Exam Mode
- Timed — total time limit for the entire session (not per-question)
- Default: 2.5 minutes per question (e.g., 30 questions = 75 minutes), configurable at session start
- `time_limit_minutes` stored on the session record
- No feedback until submission — answers are locked in
- Fixed number of questions set at session start
- Must complete all questions or run out of time
- Auto-submits when timer expires
- Results shown after submission with full review
- Simulates real PhilNITS exam pressure

---

## UI Component Architecture

### Design System (tailwind.config.ts)

Golden Hour palette mapped to Tailwind theme:

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #F5A623 | Warm golden yellow — highlights, active states |
| secondary | #FF8A65 | Soft coral — accents, secondary actions |
| background | #FFF8F0 | Warm off-white — page background |
| surface | #FFF3E6 | Cream white — cards, containers |
| accent | #C67A1A | Deep amber — CTAs, primary buttons |
| success | #4CAF50 | Warm green — correct answers, positive stats |
| danger | #E85D3A | Soft red-orange — wrong answers, errors |
| text-primary | #3D2C1E | Warm dark brown — headings, body text |
| text-secondary | #7A6555 | Medium brown — secondary text, labels |

Typography: Nunito (headings), Inter (body). Default border-radius: rounded-xl (12px). Warm-tinted shadows.

Note: `danger` (not `warning`) for wrong answers and errors — semantically correct.

### Shared UI Components (components/ui/)
- `Button` — primary (deep amber), secondary (outline), danger variants
- `Card` — cream surface, warm shadow, rounded-xl
- `Input`, `Select` — warm-bordered form elements
- `Badge` — for categories, mastery levels
- `Modal`, `Toast` — feedback and confirmations

### Quiz Components (components/quiz/)
- `QuestionCard` — question text, optional image, four answer options as clickable cards
- `Timer` — countdown bar showing remaining time for entire session (exam mode only)
- `ProgressBar` — current position (e.g., 12/30)
- `AnswerFeedback` — correct/wrong indicator with explanation (study mode only)
- `QuizNav` — previous/next/submit controls

### Dashboard Components (components/dashboard/)
- `StatCard` — single metric with icon (questions answered, accuracy %, current streak)
- `MasteryChart` — horizontal bars showing mastery % per category
- `TrendGraph` — line chart of scores over time
- `ReadinessGauge` — circular gauge, 0-100% predicted exam readiness
- `StreakDisplay` — current streak with flame icon, calendar heatmap of activity
- `WeakTopics` — ranked list of weakest categories with "Practice Now" CTA
- `ClassCard` — (teacher) class name, student count, average performance
- `StudentTable` — (teacher) sortable table with student metrics
- `QuestionPicker` — (teacher) browse/filter question bank for building assignments

### Layout Components (components/layout/)
- `Sidebar` — navigation links, role-specific menu items
- `Header` — display name, avatar, logout
- `NavLink` — active state styling for current route

### State Management
- No external state library (no Redux, Zustand)
- Server Components fetch data directly from Supabase
- Client Components use `useState`/`useReducer` for local interactive state (active quiz, timer, form inputs)
- No Supabase realtime subscriptions for MVP

---

## Question Bank

### Data Source
Past PhilNITS exam questionnaires, categorized by topic.

### Import Pipeline
- Seed script (`supabase/seed.sql`) loads categories and questions into the database
- Questions can also be imported from the existing adaptive-philnits Google Sheets pipeline and converted to SQL inserts
- IRT parameters start at defaults: difficulty=0.0, discrimination=1.0 (effectively Rasch model at launch)
- Calibration pipeline to fit parameters from collected response data is deferred to post-MVP

### Categories
Populated in the `categories` lookup table from seed data. Derived from PhilNITS exam structure. `exam_weight` values set based on historical question distribution across exams. Category dropdowns in the UI are populated from `SELECT * FROM categories`.

---

## Coding Standards

All code follows `docs/coding-standards.md`:
- Strict TypeScript (no `any`, no `as`, strict mode)
- kebab-case files, PascalCase exports
- Import ordering: framework → libraries → lib → components → types
- Component body ordering: refs → state → derived → effects → handlers → JSX
- Server Components by default, `"use client"` only when needed
- Structured logging with domain prefixes: `[auth]`, `[adaptive]`, `[session]`
- Zod validation at system boundaries (form inputs, Supabase responses)
- Atomic git commits, imperative mood, no co-author tags
