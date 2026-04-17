# Phase 3: Learn / Lessons — Design Spec

## Goal

Introduce a **Learn** pillar to Hiraya — admin-authored lessons students can study on their own, with an end-of-lesson quiz that records score and lets the student retake for mastery. Lessons live alongside (not inside) Practice and Assignments, forming a three-pillar student experience:

- **Learn** — read lessons, take quizzes (new)
- **Practice** — self-directed category practice (existing)
- **Assignments** — teacher-assigned work (existing)

## Decisions (locked)

- **Authoring:** admin-only (content in repo, no teacher editor)
- **Content storage:** markdown files in repo, DB registry for metadata + progress
- **Structure:** multiple ordered lessons per category
- **Navigation:** free — any lesson accessible at any time, no unlock gates
- **Completion tracking:** two-step — `read` and `quiz passed` tracked separately
- **Quiz format:** multiple-choice with rich content (code, images, tables in question text and options)
- **Pass threshold:** ≥70% score
- **Retakes:** unlimited
- **Attempt history:** every attempt stored (not overwritten)
- **Results UI:** score + per-question review + written explanation per question
- **Quiz progress persistence:** localStorage (Zustand `persist`) so accidental close/refresh doesn't lose answers; not synced across devices
- **IA:** dedicated top-level "Learn" section in student sidebar

---

## Architecture

### Source of truth

Lesson **content** lives in the repo as markdown + YAML frontmatter.
Lesson **metadata registry** lives in the DB, synced from the filesystem by `pnpm sync-lessons`.
Lesson **progress** (reads, quiz attempts) lives in the DB, keyed by `lesson_id` FK.

### Filesystem layout

```
content/lessons/
  <category-slug>/
    01-<lesson-slug>.md
    02-<lesson-slug>.md
content/lessons/README.md   — authoring conventions for admins
```

`<category-slug>` must match an existing row in `categories.slug`. Order is encoded in the filename prefix (`01-`, `02-`, ...).

### Frontmatter schema

```yaml
---
title: "Sorting Algorithms"
category_slug: "algorithms"
order: 1
estimated_minutes: 15
quiz:
  - prompt: "What is the worst-case time complexity of bubble sort?"
    options:
      - text: "O(n)"
      - text: "O(n log n)"
      - text: "O(n²)"
        correct: true
      - text: "O(1)"
    explanation: "Bubble sort makes a full pass for each of n elements in the worst case, yielding O(n²)."
---

# Markdown body
Lesson content here. Supports code blocks, tables, images.
```

Validated with Zod at sync and load time. Rules:
- `title`, `category_slug`, `order`, `quiz` are required; `estimated_minutes` optional.
- `quiz` must have 1..N questions; each question must have 2..6 options.
- Each question must have **exactly one** option with `correct: true`.
- `explanation` is required on every question.

### DB tables (new)

```sql
create table lessons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  slug text unique not null,            -- e.g. "algorithms/01-sorting"
  title text not null,
  order_index int not null,
  estimated_minutes int,
  content_hash text not null,           -- hash of markdown body + frontmatter, detects changes
  deleted_at timestamptz,               -- soft-delete (sync sets this if file is gone)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lessons_category_order_idx
  on lessons (category_id, order_index) where deleted_at is null;

create table lesson_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table lesson_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  score numeric(4,3) not null,          -- 0.000 to 1.000
  passed boolean not null,              -- score >= 0.7
  answers jsonb not null,               -- see shape below
  content_hash_at_attempt text not null,-- lesson content hash when attempt was submitted
  created_at timestamptz not null default now()
);

create index lesson_quiz_attempts_user_lesson_idx
  on lesson_quiz_attempts (user_id, lesson_id, created_at desc);
```

**`answers` jsonb shape:**

```jsonc
[
  {
    "questionIndex": 0,
    "selectedIndex": 2,
    "correctIndex": 2,   // snapshotted from the lesson at submit time
    "correct": true      // === (selectedIndex === correctIndex)
  },
  ...
]
```

Snapshotting `correctIndex` makes right/wrong review accurate even if the lesson's correct answer changes later. Question prompts, options, and explanations are NOT snapshotted — the results page loads those from the current lesson. If `content_hash_at_attempt !== current lesson hash`, the results page renders a small banner ("This lesson has been updated since your attempt — explanations shown reflect the latest version") so students aren't confused by mismatches.

### RLS

- `lessons` — read: any authenticated user. Write: service role only.
- `lesson_reads` — select/insert/delete: `user_id = auth.uid()`. No update (read is a single timestamp).
- `lesson_quiz_attempts` — select/insert: `user_id = auth.uid()`. No update, no delete.
- Service role (used only by sync script) bypasses RLS for `lessons` writes.

### Sync script — `pnpm sync-lessons`

Entry at `scripts/sync-lessons.ts`. Algorithm:

1. Walk `content/lessons/**/*.md`.
2. Parse frontmatter with `gray-matter` and validate with the Zod schema. Any failure aborts with the filename and error.
3. Build a map of filesystem slugs → parsed lesson.
4. For each parsed lesson: compute `content_hash` (SHA-256 of `frontmatter JSON + body`). Look up category by `category_slug`. Upsert by `slug`. If `content_hash` changed, update `updated_at`.
5. For each `lessons` row whose `slug` is no longer in the filesystem and `deleted_at is null`: set `deleted_at = now()`.
6. Print a summary: N new, N updated, N unchanged, N soft-deleted.

Uses the Supabase **service role** client (same pattern as `scripts/seed-test-users.ts`). Run by the admin when publishing new content. No auto-run on deploy in this phase — keeps the content lifecycle explicit. Can be CI-automated later.

---

## Student UX flow

### Routes (all under `src/app/(student)/learn/`)

```
/learn                                           → hub (categories grid)
/learn/[categorySlug]                            → lesson list for category
/learn/[categorySlug]/[lessonSlug]               → lesson reader
/learn/[categorySlug]/[lessonSlug]/quiz          → quiz flow
/learn/[categorySlug]/[lessonSlug]/quiz/results  → last attempt summary + review
```

### Sidebar

Add "Learn" between Practice and Classes in `src/components/layout/sidebar.tsx`. Icon: book-open (Lucide, already in project).

### Hub — `/learn`

- Fetches: all non-deleted categories + per-category aggregates for the current user: total lessons, lessons read, best-score average across quizzed lessons.
- Renders a grid of category cards. Each card: category name, "X of Y lessons read", a small ring or bar for read %, and a "Quiz avg: NN%" line if any quizzes taken.
- Click card → `/learn/[categorySlug]`.

### Category page — `/learn/[categorySlug]`

- Fetches: category + its non-deleted lessons (ordered by `order_index`) + current user's `lesson_reads` rows for those lessons + current user's best `lesson_quiz_attempts` per lesson.
- Renders: category header, vertical list of lesson rows. Each row:
  - Title + estimated minutes
  - Two status chips — **Read** (gray → gold when a `lesson_reads` row exists) and **Quiz passed** (gray → green when any attempt for this lesson has `passed = true`)
  - Best quiz score if any attempts exist
- Click row → lesson reader.

### Lesson reader — `/learn/[categorySlug]/[lessonSlug]`

- Fetches: lesson metadata from DB + lesson content (markdown body + quiz **prompts/options only**, never answers) from filesystem loader + current user's `lesson_reads` state.
- Renders: markdown body via `react-markdown` + `rehype-highlight` (code blocks) + `remark-gfm` (tables). Sticky footer with two buttons:
  - **Mark as read** — primary action while not read; optimistic update via store; toast "Marked as read". Once read, the button is replaced with a passive "Read ✓" indicator (not a toggle — unread is not a goal state).
  - **Start quiz** — always available regardless of read state. Navigates to `/quiz`.

### Quiz page — `/learn/.../quiz`

- Fetches: lesson content (prompts + options + `content_hash`, no answers).
- Renders: one question per screen, styled to match existing practice-session question component. Progress indicator at top ("3 of 10"). Previous / Next buttons. On the last question, Next becomes Submit.
- **Draft persistence (Zustand `persist` → localStorage):**
  - Draft key: `quiz-draft:<lessonId>`.
  - Stored fields: `answers` (array of selected indices, `null` for unanswered), `contentHash`, `startedAt`.
  - On mount: if a draft exists for this lesson AND `contentHash` matches current lesson hash, silently restore answers and navigate to the last-answered question. If the hash differs, discard the draft and start fresh.
  - On every answer change: persist updated draft.
  - On successful submit (server returns attempt): clear the draft.
- On submit → calls `submitQuizAttempt` server action → redirects to `/results` with the attempt ID.

### Results page — `/learn/.../quiz/results`

- Fetches: the attempt row + full lesson (including answer key + explanations).
- Renders:
  - Top: score (%), pass/fail badge, "N of M correct"
  - Per-question review: the question, each option marked correct/incorrect, the student's selection highlighted, the written explanation
  - Footer: **Retake quiz** (→ `/quiz`) + **Back to lesson** + a small "View past attempts" disclosure that reveals a list of prior attempts (date, score, passed). No chart.

### Dashboard touch

Student dashboard (`src/app/dashboard/page.tsx`) gains a small "Continue learning" card surfacing the most recent in-progress lesson: the highest-ranked unquizzed-but-read lesson; if none, the first unread lesson in any category the student has started. Single section addition; no new route.

---

## Stores, server actions, hydration

### New files

```
content/lessons/                            — authored markdown
content/lessons/README.md                   — authoring guide for admins
src/lib/lessons/
  schema.ts                                 — Zod schema for frontmatter
  loader.ts                                 — reads and caches filesystem lessons
  hash.ts                                   — content hash helper

scripts/sync-lessons.ts                     — admin sync command

src/app/(student)/learn/
  page.tsx
  [categorySlug]/
    page.tsx
    [lessonSlug]/
      page.tsx
      quiz/
        page.tsx
        results/
          page.tsx
  actions.ts                                — markLessonRead, submitQuizAttempt

src/stores/
  lesson-progress-store.ts                  — reads + best/all attempts
  quiz-draft-store.ts                       — localStorage-persisted quiz drafts

src/components/hydrators/
  lesson-progress-hydrator.tsx
```

### Server actions — `src/app/(student)/learn/actions.ts`

```typescript
markLessonRead(lessonId: string): Promise<{ error?: string }>
// Upserts lesson_reads row (user_id, lesson_id). Idempotent.

submitQuizAttempt(input: {
  lessonId: string;
  answers: { questionIndex: number; selectedIndex: number }[];
}): Promise<{ attempt?: LessonQuizAttempt; error?: string }>
// Server loads the lesson, validates each answer against the correct option,
// computes score = correctCount / totalCount, passed = score >= 0.7,
// inserts lesson_quiz_attempts row with content_hash_at_attempt, returns it.
// Rejects if: lesson doesn't exist, is soft-deleted, or answers don't match lesson shape.
```

**Answer key never crosses the network to the client during the quiz.** The lesson loader exposes two shapes:
- `getLessonForReader(slug)` → body + questions with prompts/options (no `correct` flag, no explanations).
- `getLessonForResults(slug)` → full lesson including answers and explanations. Only called from the results page, after an attempt exists.

### Stores

**`lesson-progress-store.ts`** (Zustand, same pattern as Phase 2 stores):

```typescript
interface LessonProgressStore {
  reads: Record<string, { readAt: string }>;                  // keyed by lessonId
  bestAttempts: Record<string, LessonQuizAttempt>;            // keyed by lessonId
  attemptsByLesson: Record<string, LessonQuizAttempt[]>;      // lazy-loaded on results page

  hydrate: (input: {
    reads: Array<{ lessonId: string; readAt: string }>;
    bestAttempts: LessonQuizAttempt[];
  }) => void;

  markRead: (lessonId: string) => Promise<void>;              // optimistic + toast
  submitAttempt: (input: SubmitInput) => Promise<LessonQuizAttempt | null>;
                                                              // not optimistic — shows "Grading..."
}
```

`markRead` uses `performOptimisticUpdate` from `src/lib/optimistic-update.ts` (Phase 2 utility). `submitAttempt` does not — the server's score is authoritative and worth waiting for.

**`quiz-draft-store.ts`** (Zustand with `persist` middleware, storage: localStorage):

```typescript
interface QuizDraft {
  answers: (number | null)[];   // selectedIndex per question, null = unanswered
  contentHash: string;
  startedAt: string;
}

interface QuizDraftStore {
  drafts: Record<string, QuizDraft>; // keyed by lessonId
  startOrResume: (lessonId: string, contentHash: string, questionCount: number) => QuizDraft;
  setAnswer: (lessonId: string, questionIndex: number, selectedIndex: number) => void;
  clearDraft: (lessonId: string) => void;
}
```

`startOrResume` returns the existing draft if hash matches; otherwise creates and persists a new one (discarding any stale draft).

### Hydration

Each Learn page fetches what it needs on the server, renders a hydrator client component, then renders content that reads from the store. Same pattern as `src/components/hydrators/class-store-hydrator.tsx`.

### Loader caching

`src/lib/lessons/loader.ts` reads markdown from `content/lessons/**`. Parsed lessons cached in a module-level Map:

- **Production:** cache is effectively permanent until the Node process restarts (i.e., next deploy). No invalidation logic.
- **Development:** cache is bypassed — every call re-reads from disk so editing markdown shows up on refresh.

No external cache (no Redis, no file-hash revalidation at request time). Simpler is better here.

---

## Edge cases

- **Lesson deleted from filesystem.** Sync sets `deleted_at`. Deleted lessons are hidden from the UI but progress rows remain for history. Hard-deletion is a manual DB action.
- **Lesson renamed (slug changed).** Treated as delete + create. Progress on the old slug stays attached to the now-deleted row. Documented in `content/lessons/README.md` as "avoid renaming slugs."
- **Lesson moved to a different category.** Change `category_slug` in frontmatter but keep the filename/slug. Sync updates `category_id`. Progress rows unchanged.
- **Frontmatter invalid.** Sync fails loudly with filename + Zod error; no DB writes. In dev, the loader surfaces the same error when a user navigates to the broken lesson.
- **Quiz with 0 or multiple correct options.** Zod rejects at sync time. Schema enforces exactly one `correct: true` per question.
- **Content changes between quiz draft save and submit.** Draft is keyed by `content_hash`. On quiz page mount, if the stored hash doesn't match the current lesson hash, the draft is discarded and the student starts fresh. No prompt; silent restart with a subtle toast ("Lesson was updated — restarting quiz").
- **Content changes between submit and results viewing.** The attempt row stores `correctIndex` per question in `answers` jsonb plus a `content_hash_at_attempt`. Right/wrong markings are always accurate against the content that was quizzed. Prompts, options, and explanations re-render from the current lesson; if hashes differ, results page shows a banner noting the lesson was updated.
- **Student closes browser mid-quiz.** Answers are in localStorage; restored on return.
- **Student clears browser data mid-quiz.** Draft lost; student starts over. Acceptable — matches localStorage semantics.
- **Student opens quiz in two tabs.** Both tabs share localStorage. Last writer wins on each question. Acceptable edge case for a study quiz.
- **Zero lessons in a category.** Category card shows "0 lessons — coming soon" and the category page shows an empty state.
- **Category slug in frontmatter doesn't match any DB category.** Sync fails with a clear error. Admin must create the category first (via existing seed/admin tooling).

---

## Testing

### Unit
- `schema.ts` — valid frontmatter, missing fields, wrong types, zero correct options, multiple correct options, empty quiz.
- `hash.ts` — stable hash for same input, different hash for body edit, different hash for frontmatter edit.
- Quiz scoring — 0%, 50%, 70% boundary (passed), 100%.

### Integration (against a test Supabase project)
- `markLessonRead` — first call inserts, second call no-ops, cross-user read via RLS denied.
- `submitQuizAttempt` — valid attempt inserts; tampering (wrong indices) rejected; deleted lesson rejected; score/passed computed correctly.
- Sync script — new lesson inserted; edited lesson updates hash; removed lesson soft-deleted; existing progress rows preserved.

### Manual verification checklist
Per the global CLAUDE.md instruction, a `Manual Verification Checklist` will be produced as a separate document after this spec is approved and before implementation begins.

### Out of scope this round
- E2E/browser automation tests.

---

## Migration & rollout

- All tables are new. No data migration.
- Seed the first 3 lessons in one category (**recommended: Software Engineering**, since it's PhilNITS-heavy and we already have matching questions in the bank) so the feature ships with real content.
- No feature flag. Learn is additive — unreached if the student never clicks "Learn" in the sidebar.
- The sidebar link is always visible for students. Empty states handle "no lessons yet."

---

## Scope boundaries — explicit non-goals

- **Teacher-authored lessons.** Admin-only for now.
- **Admin CMS UI.** Markdown in repo is sufficient.
- **Cross-device resume of in-progress quizzes.** localStorage only.
- **Adaptive lesson recommendations.** Future integration with the adaptive engine.
- **"Practice just this lesson's topics."** Future enhancement — could link lesson → filtered practice session.
- **Certificates / badges / gamification.** Not in this phase.
- **Teacher-assigned lessons.** Could be added later as a `lesson_assignments` table.
- **Offline reading / mobile-specific UI.** Phase 4.

---

## Dependencies

- `gray-matter` — YAML frontmatter parsing (new).
- `react-markdown` + `remark-gfm` + `rehype-highlight` — markdown rendering with GFM tables and syntax-highlighted code (new — to verify existing; add if absent).
- `zod` — already in project.
- `zustand` — already in project; use its `persist` middleware for the draft store.

---

## Architecture diagram

```
┌────────────────────────┐
│  content/lessons/*.md  │   authored by admin, committed to repo
└────────┬───────────────┘
         │  pnpm sync-lessons
         ▼
┌────────────────────────┐
│   lessons table (DB)   │   registry: id, category_id, slug, order, hash, deleted_at
└────────┬───────────────┘
         │  FK
         ▼
┌────────────────────────┐    ┌────────────────────────────┐
│  lesson_reads (DB)     │    │ lesson_quiz_attempts (DB)  │
└────────────────────────┘    └────────────────────────────┘

Runtime request path:
  Server Component
    ├── fetches lesson metadata from DB (loader uses cached module)
    ├── fetches lesson content from filesystem (loader)
    ├── fetches user progress from DB
    └── passes to <LessonProgressHydrator/> → useLessonProgressStore

  Quiz page
    ├── reads from useQuizDraftStore (localStorage) for mid-attempt state
    └── calls submitQuizAttempt server action → authoritative score
```
