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
- **Quiz format:** multiple-choice with rich content (code, images, tables in question text, options, and explanations — all rendered as markdown)
- **Pass threshold:** ≥70% of questions correct (integer arithmetic — no float rounding)
- **Retakes:** unlimited
- **Attempt history:** every attempt stored (not overwritten)
- **Results UI:** score + per-question review + written markdown explanation per question
- **Quiz progress persistence:** `localStorage` via Zustand `persist` so accidental close/refresh doesn't lose answers; not synced across devices
- **IA:** dedicated top-level "Learn" section in student sidebar, positioned between Practice and Assignments

## Revisions from independent design review (2026-04-17)

This spec incorporates findings from an independent review. Key changes vs. the first draft:
- Answer key is strictly server-only; results page uses a dedicated server action (no client import path to the answer key — finding #4).
- `lesson_quiz_attempts` is service-role-write only; students cannot insert rows directly via the Supabase client (finding #6).
- Score stored as `correct_count` / `total_count` integers, not a float (finding #11).
- Separate `quiz_hash` so drafts survive explanation-only edits (finding #13).
- Store hydration uses explicit merge methods, not replace (finding #9).
- Zustand `persist` gated behind `useHasHydrated` to avoid SSR mismatch (finding #10).
- Sync script uses a Postgres advisory lock (finding #1).
- Implementation decomposed into four sub-phases 3a–3d (finding #12).
- Plus smaller fixes: rate-limit & Zod validation on submit, content_hash re-read from DB at submit, best-score index, explicit category soft-delete story, seeding flow.

---

## Architecture

### Source of truth

- Lesson **content** lives in the repo as markdown + YAML frontmatter.
- Lesson **metadata registry** lives in the DB, synced from the filesystem by `pnpm sync-lessons`.
- Lesson **progress** (reads, quiz attempts) lives in the DB, keyed by `lesson_id` FK.
- The **answer key and explanations** are server-only. No code path exposes them to the client except through the `getResultsView` server action, after an attempt has been submitted.

### Filesystem layout

```
content/lessons/
  <category-slug>/
    01-<lesson-slug>.md
    02-<lesson-slug>.md
content/lessons/README.md   — authoring conventions for admins
```

`<category-slug>` must match an existing row in `categories.slug`. Order is encoded in the filename prefix.

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
    explanation: |
      Bubble sort makes a full pass for each of `n` elements in the worst case,
      yielding **O(n²)**. See the lesson body above for the derivation.
---

# Markdown body
Lesson content here. Supports code blocks, tables, images.
```

Validated with Zod at sync and load time. Rules:
- `title`, `category_slug`, `order`, `quiz` are required; `estimated_minutes` optional.
- `quiz` must have 1..N questions; each question must have 2..6 options.
- Each question must have **exactly one** option with `correct: true`.
- `explanation` is required on every question. Rendered as markdown (same pipeline as lesson body).

### Server-only boundary

Two loader modules, kept in separate files so import mistakes are loud:

```
src/lib/lessons/
  loader-public.ts         — safe for any server component; NO answer key
  loader-server-only.ts    — imports "server-only" at top; answer key + explanations
  schema.ts                — Zod frontmatter schema (no imports from loader-*)
  hash.ts                  — SHA-256 helpers for content_hash and quiz_hash
```

`loader-server-only.ts` starts with `import "server-only";` so Next.js throws a build error if it's ever imported from a client component. Client components never reach this module; even server components reach it only through the `submitQuizAttempt` and `getResultsView` server actions.

`loader-public.ts` exposes `getLessonForReader(slug)` → body + questions with prompts and option text. The returned type has **no** `correct` flag, **no** `explanation`. Types are narrowed at the module boundary, not stripped at render time.

### DB tables (new)

```sql
create table lessons (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete restrict,
  slug text unique not null,            -- e.g. "algorithms/01-sorting"
  title text not null,
  order_index int not null,
  estimated_minutes int,
  content_hash text not null,           -- SHA-256 of body + full frontmatter
  quiz_hash text not null,              -- SHA-256 of quiz prompts + options + correct flags (NOT explanations)
  deleted_at timestamptz,               -- soft-delete set by sync when file is removed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lessons_category_order_idx
  on lessons (category_id, order_index) where deleted_at is null;

create table lesson_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete restrict,
  read_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table lesson_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete restrict,
  correct_count int not null check (correct_count >= 0),
  total_count int not null check (total_count > 0),
  passed boolean not null,              -- correct_count * 10 >= total_count * 7
  answers jsonb not null,               -- see shape below
  content_hash_at_attempt text not null,
  quiz_hash_at_attempt text not null,
  created_at timestamptz not null default now(),
  check (correct_count <= total_count)
);

-- Best-score lookups (hub + category page aggregates)
create index lesson_quiz_attempts_user_lesson_best_idx
  on lesson_quiz_attempts (user_id, lesson_id, correct_count desc, total_count);

-- Recent attempts for results/history
create index lesson_quiz_attempts_user_lesson_recent_idx
  on lesson_quiz_attempts (user_id, lesson_id, created_at desc);
```

**Pass calculation uses integer arithmetic:** `passed = (correct_count * 10 >= total_count * 7)`. No float precision surprises at the 0.7 boundary. Score for display = `correct_count / total_count` computed in the UI.

**`on delete restrict`** on lesson FK columns: progress rows are not auto-destroyed if a row is hard-deleted. Admin must explicitly move/delete progress if they really want to hard-delete a lesson. Soft-delete (the normal path) leaves progress untouched because the `lessons` row remains.

**`answers` jsonb shape:**

```jsonc
[
  {
    "questionIndex": 0,
    "selectedIndex": 2,
    "correctIndex": 2,   // snapshotted from lesson at submit time
    "correct": true      // === (selectedIndex === correctIndex)
  },
  ...
]
```

Snapshotting `correctIndex` makes right/wrong review accurate even if the lesson's correct answer changes. Prompts, options, and explanations re-render from the current lesson. If `content_hash_at_attempt !== current lesson.content_hash`, the results page shows a banner noting the lesson was updated since the attempt.

### RLS

- `lessons` — select: any authenticated user. Insert/update/delete: service role only.
- `lesson_reads` — select/insert/delete: `user_id = auth.uid()`. No update.
- `lesson_quiz_attempts` — **select: `user_id = auth.uid()`. Insert/update/delete: service role only.**
  - Rationale: preventing a student from forging an attempt row with `correct_count = total_count, passed = true`. All inserts go through the `submitQuizAttempt` server action, which uses the service-role client after validating the submitted answers against the server-side answer key.

### Sync script — `pnpm sync-lessons`

Entry at `scripts/sync-lessons.ts`. Uses the service role client (same pattern as `scripts/seed-test-users.ts`).

**Concurrency safety:** takes a Postgres advisory lock at the start — `SELECT pg_advisory_lock(hashtext('sync-lessons'))`. Two simultaneous runs can't thrash; the second waits. Released on exit (including failure paths).

**Algorithm:**

1. Acquire advisory lock.
2. Walk `content/lessons/**/*.md`.
3. Parse frontmatter with `gray-matter` and validate with the Zod schema. Any failure aborts with filename + error; no DB writes.
4. Compute `content_hash` (body + full frontmatter JSON) and `quiz_hash` (prompts + options + correct flags) for each lesson.
5. Begin transaction. For each parsed lesson: look up category by `category_slug` (fail if missing), upsert the `lessons` row by `slug`, set `deleted_at = null` if previously soft-deleted. Only update `updated_at` when `content_hash` actually changed.
6. For each `lessons` row whose slug is no longer in the filesystem and `deleted_at is null`: set `deleted_at = now()`.
7. Detect slug changes at the file level: if a file's slug (path relative to `content/lessons/`) changes between runs, there's no way to distinguish rename from delete+create — print a loud warning listing disappeared + newly-appeared slugs side-by-side, and refuse to proceed unless `--allow-orphaned-progress` flag is passed. Progress rows stay tied to the deleted slug; the admin decides whether to migrate them.
8. Commit transaction. Release advisory lock.
9. Print summary: N new, N updated, N unchanged, N soft-deleted, warnings (if any).

### Serverless deployment considerations

`content/lessons/**` must be bundled into the Next.js deploy. Add to `next.config.js`:

```js
experimental: {
  outputFileTracingIncludes: {
    "/learn/**": ["./content/lessons/**"]
  }
}
```

**Cache semantics:**
- **Production (serverless):** Each lambda instance memoizes parsed lessons on first access in-memory. To handle post-sync content drift across warm instances, every read path re-checks `lessons.content_hash` from the DB and invalidates its cached entry on mismatch. Cost: one `select content_hash from lessons where id = ?` per lesson read. Acceptable (lessons are small in count, DB lookup is <5ms).
- **Development:** cache bypassed entirely — every call re-reads from disk so markdown edits show up on refresh.

No external cache (no Redis). The DB is the coherence point.

---

## Student UX flow

### Sidebar

Add `{ href: "/learn", label: "Learn", icon: "📖" }` to `studentWithClassLinks` and `studentNoClassLinks` in `src/components/layout/sidebar.tsx`, **between Practice and Assignments/Join Class**. Order becomes:
- `studentWithClassLinks`: Dashboard → Practice → **Learn** → Assignments → Profile
- `studentNoClassLinks`: Dashboard → Practice → **Learn** → Join Class → Profile

### Routes (all under `src/app/(student)/learn/`)

```
/learn                                           → hub (categories grid)
/learn/[categorySlug]                            → lesson list for category
/learn/[categorySlug]/[lessonSlug]               → lesson reader
/learn/[categorySlug]/[lessonSlug]/quiz          → quiz flow
/learn/[categorySlug]/[lessonSlug]/quiz/results  → last attempt summary + review
```

### Hub — `/learn`

- Fetches: non-deleted categories + per-category aggregates for current user (total lessons, lessons read, best-attempt score across quizzed lessons).
- Renders a grid of category cards. Each card: category name, "X of Y lessons read", a small ring/bar for read %, and "Quiz avg: NN%" if any attempts exist.
- Click card → `/learn/[categorySlug]`.

### Category page — `/learn/[categorySlug]`

- Fetches: category + its non-deleted lessons (ordered by `order_index`) + current user's `lesson_reads` rows for those lessons + best attempt per lesson (via the `_best_idx` index).
- Renders: category header, vertical list of lesson rows. Each row shows title, estimated minutes, two status chips — **Read** and **Quiz passed** — and best quiz score if any attempts exist.

### Lesson reader — `/learn/[categorySlug]/[lessonSlug]`

- Fetches: lesson metadata from DB + public lesson content (via `loader-public.ts` — no answers) + current user's `lesson_reads` state.
- Renders markdown body via `react-markdown` + `remark-gfm` (tables) + `rehype-highlight` (code blocks).
- Sticky footer:
  - **Mark as read** — primary while not read; optimistic update; toast. Once read, swaps to a passive "Read ✓" indicator (not a toggle).
  - **Start quiz** — always available, regardless of read state.

### Quiz page — `/learn/.../quiz`

- Fetches: `getLessonForReader` (prompts + options + `quiz_hash`, no answers).
- Renders one question per screen, matching the practice-session question component.
- **Draft persistence** (Zustand `persist`, localStorage):
  - Key: `quiz-draft:<lessonId>`.
  - Stored fields: `answers` (selectedIndex or null per question), `quizHash`, `startedAt`.
  - On mount: read draft (behind `useHasHydrated`, below). If `draft.quizHash === lesson.quiz_hash`, silently restore and jump to the last-answered question. If mismatched, discard draft, show a subtle toast ("Lesson was updated — starting fresh").
  - **Note:** comparison uses `quiz_hash`, not `content_hash`. Edits to explanations or lesson body do NOT discard the draft — only changes to prompts, options, or correct answers.
  - On every answer change: persist updated draft.
  - On successful submit: clear the draft.
- `useHasHydrated()` hook gates any UI that reads from `useQuizDraftStore` — prevents SSR/CSR hydration mismatch.
- On submit → calls `submitQuizAttempt` server action → redirects to `/results` with attempt ID.

### Results page — `/learn/.../quiz/results`

- Fetches: results via `getResultsView(attemptId)` server action, which returns `{ attempt, lesson }` where `lesson` includes answers and explanations. No client import of the server-only loader.
- Renders: score badge, per-question review with the student's selection highlighted, correct answer marked, and the markdown-rendered explanation beneath each question.
- Footer: **Retake quiz**, **Back to lesson**, disclosure "View past attempts" revealing a list (date, score, passed).
- If `attempt.content_hash_at_attempt !== lesson.content_hash`: small banner — "This lesson has been updated since your attempt. Explanations may reflect the latest version."

### Dashboard touch

Student dashboard gains a small "Continue learning" card — surfaces the most recent lesson the student has read but not yet passed a quiz on; if none, the first unread lesson in a category they have any activity in. Single section addition to `src/app/dashboard/page.tsx`.

---

## Stores, server actions, hydration

### New files

```
content/lessons/                                — authored markdown
content/lessons/README.md                       — authoring guide

src/lib/lessons/
  schema.ts                                     — Zod frontmatter schema
  hash.ts                                       — content_hash + quiz_hash helpers
  loader-public.ts                              — no answer key
  loader-server-only.ts                         — with answers, `import "server-only"`

src/lib/use-has-hydrated.ts                     — hook for persist-store hydration gating

scripts/sync-lessons.ts                         — admin sync command (advisory lock + transaction)

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
  actions.ts                                    — markLessonRead, submitQuizAttempt, getResultsView

src/stores/
  lesson-progress-store.ts                      — reads + best attempts (merge semantics)
  quiz-draft-store.ts                           — localStorage-persisted drafts, LRU-capped

src/components/hydrators/
  lesson-progress-hydrator.tsx
```

### Server actions — `src/app/(student)/learn/actions.ts`

All three use the Supabase client bound to the current user's session (cookie-based auth). `submitQuizAttempt` additionally uses a service-role client to insert into `lesson_quiz_attempts` because RLS restricts that table.

```typescript
markLessonRead(lessonId: string): Promise<{ error?: string }>
// Upserts lesson_reads. Idempotent. User-session client (RLS permits own rows).
```

```typescript
submitQuizAttempt(input: {
  lessonId: string;
  answers: { questionIndex: number; selectedIndex: number }[];
}): Promise<{ attempt?: LessonQuizAttempt; error?: string }>
```

Behavior:
1. **Rate limit:** per-user token bucket (1 submit / 3s), implemented via in-memory limiter keyed on `userId`. Returns `{ error: "Too fast" }` on 429.
2. **Zod validation:**
   - `answers.length === lesson.quiz.length`
   - Every `questionIndex` in `[0, quiz.length)` appears exactly once
   - Every `selectedIndex` in `[0, options.length)` for that question
3. Loads the lesson via `loader-server-only.ts` to access the answer key.
4. Reads `lessons.content_hash` and `lessons.quiz_hash` from the DB (not from in-memory cache) — authoritative value at submit time.
5. Builds `answers` jsonb with `correctIndex` snapshots. Computes `correct_count`, `total_count`, `passed = correct_count * 10 >= total_count * 7`.
6. Inserts row via service-role client. Returns the inserted attempt.
7. Rejects if lesson is soft-deleted.

```typescript
getResultsView(attemptId: string): Promise<{
  attempt: LessonQuizAttempt;
  lesson: LessonWithAnswers;
  hashDrifted: boolean;
} | { error: string }>
```

Called by the results page (server component). Fetches the attempt (RLS ensures user can only read own rows), then loads the lesson via `loader-server-only.ts`. Returns `hashDrifted = attempt.content_hash_at_attempt !== lesson.content_hash` so the UI can render the banner.

### Stores

**`lesson-progress-store.ts`** — Zustand, follows Phase 2 store-per-entity pattern:

```typescript
interface LessonProgressStore {
  reads: Record<string, { readAt: string }>;              // keyed by lessonId
  bestAttempts: Record<string, LessonQuizAttempt>;        // keyed by lessonId

  // Merge semantics (do NOT replace the whole map)
  hydrateReads: (reads: Array<{ lessonId: string; readAt: string }>) => void;
  hydrateBestAttempts: (attempts: LessonQuizAttempt[]) => void;

  markRead: (lessonId: string) => Promise<void>;          // optimistic + toast
  submitAttempt: (input: SubmitInput) => Promise<LessonQuizAttempt | null>;
                                                          // non-optimistic ("Grading…")
}
```

Each hydrator supplies only the slice it fetched (hub supplies all categories' reads; category page supplies that category's reads — both accumulate into `reads` without wiping the other slice). This avoids the "last hydrator wins" bug.

`markRead` uses `performOptimisticUpdate` from `src/lib/optimistic-update.ts` (Phase 2 utility). `submitAttempt` doesn't — the server's score is authoritative; the UI shows "Grading…" briefly.

**`quiz-draft-store.ts`** — Zustand with `persist` middleware (storage: `localStorage`):

```typescript
interface QuizDraft {
  answers: (number | null)[];   // selectedIndex per question
  quizHash: string;
  startedAt: string;
  touchedAt: string;             // for LRU eviction
}

interface QuizDraftStore {
  drafts: Record<string, QuizDraft>;                                   // keyed by lessonId
  hasHydrated: boolean;                                                // for useHasHydrated
  startOrResume: (lessonId: string, quizHash: string, questionCount: number) => QuizDraft;
  setAnswer: (lessonId: string, questionIndex: number, selectedIndex: number) => void;
  clearDraft: (lessonId: string) => void;
}
```

**LRU cap:** `drafts` retains at most 5 lessons. When `startOrResume` or `setAnswer` runs, any excess entries (keyed by `touchedAt`) are evicted. Prevents localStorage growth from abandoned quizzes.

**`startOrResume`** returns the existing draft if `quizHash` matches; otherwise creates and persists a new one (discarding any stale draft for that lesson).

**`useHasHydrated()`** — `src/lib/use-has-hydrated.ts`:

```typescript
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}
```

Any UI that reads from `useQuizDraftStore` renders a loading state until `useHasHydrated() === true`. Prevents the SSR/CSR mismatch warning from Zustand `persist`.

### Hydration

Each Learn page fetches what it needs on the server and passes it to `<LessonProgressHydrator>`, which calls the appropriate slice hydrator (`hydrateReads`, `hydrateBestAttempts`) on mount via the Phase 2 hydrator pattern (`useRef` gate, synchronous `getState().hydrateX(...)`).

---

## Edge cases

- **Lesson deleted from filesystem.** Sync sets `deleted_at`. UI filters out deleted lessons. Progress rows remain for history. Hard-delete requires DBA action and would fail without cleanup because of `on delete restrict`.
- **Lesson renamed (slug changed).** Treated as delete + create. Sync script refuses to proceed without `--allow-orphaned-progress` flag and logs the pair of slugs. Operator decides whether to migrate progress manually.
- **Lesson moved to a different category.** Change `category_slug` in frontmatter but keep the filename/slug unchanged. Sync updates `category_id` only. Progress rows unaffected.
- **Explanation-only edit.** `content_hash` changes but `quiz_hash` does not. In-progress quiz drafts survive; attempts' `quiz_hash_at_attempt` still matches; results page hashDrifted banner may appear (uses `content_hash`) — acceptable and informative.
- **Frontmatter invalid.** Sync fails loudly with filename + Zod error; no DB writes.
- **Quiz with 0 or multiple correct options.** Zod rejects at sync time.
- **Content changes between quiz draft save and submit.** Draft is keyed by `quiz_hash`. On mount, quiz-affecting mismatch silently restarts (subtle toast). Explanation-only edits don't trigger reset.
- **Content changes between submit and results viewing.** `hashDrifted` banner renders. Per-question right/wrong always accurate (snapshotted `correctIndex`).
- **Student closes browser mid-quiz.** Draft in localStorage; restored on return.
- **Student clears browser data mid-quiz.** Draft lost; student restarts. Acceptable.
- **Student opens quiz in two tabs.** Both share localStorage. Last writer per answer wins. Acceptable.
- **Student tries to forge a quiz attempt via raw Supabase client.** RLS blocks (service-role-only insert).
- **Student tampers with submit payload.** Zod validation rejects; server recomputes score from its own answer key regardless.
- **Student spams submit.** Rate limiter returns "Too fast."
- **Zero lessons in a category.** Category card shows "coming soon"; category page renders empty state.
- **`category_slug` in frontmatter doesn't match any DB category.** Sync fails with clear error; admin must add the category first.
- **Category soft-deleted** (existing `categories` schema may or may not have `deleted_at` — verify during 3a implementation). If it does: hub and category page filter out soft-deleted categories. If the schema doesn't support soft-delete, category hard-delete is blocked by `lessons.category_id on delete restrict` — admin must soft-delete all lessons first (or add `deleted_at` to categories in a future migration).
- **Serverless instance serving stale content after sync.** Each read re-checks `lessons.content_hash` from DB and invalidates its cache on mismatch.
- **Two admins run `sync-lessons` simultaneously.** Advisory lock serializes them.
- **Sync interrupted mid-run.** Transaction rolls back; advisory lock released by connection termination. Re-run is safe.
- **Empty string `selectedIndex` / missing answers.** Zod rejects; student can't submit a partial attempt. UI disables submit until every question has a selection.

---

## Testing

### Unit
- `schema.ts` — valid + invalid frontmatter (missing fields, wrong types, zero correct options, multiple correct options, empty quiz).
- `hash.ts` — stable output for same input; `content_hash` changes on body edit; `quiz_hash` unchanged on explanation-only edit.
- Pass math — 0/10 fail, 6/10 fail, 7/10 pass, 10/10 pass.
- LRU eviction in `quiz-draft-store`.

### Integration (against a test Supabase project)
- `markLessonRead` — first call inserts, second no-ops, cross-user read denied by RLS.
- `submitQuizAttempt` — valid attempt inserts; tampered indices rejected by Zod; student cannot insert directly via client (RLS denies); score computation correct; content_hash read from DB, not cache; rate-limiter returns 429 on second submit within 3s.
- `getResultsView` — returns attempt + lesson for owner; denies for other users; hashDrifted flag accurate.
- Sync script — new lesson inserted; edited lesson updates hash; removed lesson soft-deleted; existing progress preserved; advisory lock serializes concurrent runs; rename detection triggers warning.

### Manual verification checklist
Produced as a separate document per project convention, after this spec is approved and before implementation of 3a begins.

### Out of scope
E2E/browser automation tests.

---

## Implementation decomposition

This spec is one cohesive design; implementation is split into four phases, each an independently reviewable/mergeable PR:

- **Phase 3a — Schema + loader + sync.** Migration for `lessons`, `lesson_reads`, `lesson_quiz_attempts`. RLS policies. `loader-public.ts` + `loader-server-only.ts` + `schema.ts` + `hash.ts`. `scripts/sync-lessons.ts`. `content/lessons/README.md`. No UI. Verified by running sync against a seeded category and inspecting the DB.
- **Phase 3b — Reader + mark-as-read.** Hub, category page, lesson reader. `lesson-progress-store.ts` (reads slice only). Hydrator. Sidebar link. No quiz yet — "Start quiz" button disabled with tooltip "Coming soon."
- **Phase 3c — Quiz + results.** `submitQuizAttempt`, `getResultsView`, rate limiter, quiz page, results page, `quiz-draft-store.ts`, `useHasHydrated`. Wire up "Start quiz" button. Full end-to-end quiz flow.
- **Phase 3d — Dashboard + seed content.** "Continue learning" card. Seed 3 real lessons for one category (recommended: Software Engineering). Final polish and verification checklist run.

Each sub-phase gets its own implementation plan via the writing-plans skill.

---

## Migration & rollout

- All tables new. No data migration.
- Seeding mechanism: admin runs `pnpm sync-lessons` post-3a-deploy to register lessons. Same script used for initial seed and subsequent content updates. No separate `seed-lessons` helper.
- No feature flag. Learn is additive — unreached if the student never clicks "Learn."

---

## Scope boundaries — explicit non-goals

- Teacher-authored lessons (admin only).
- Admin CMS UI (markdown in repo is sufficient).
- Cross-device resume of in-progress quizzes (localStorage only).
- Adaptive lesson recommendations.
- "Practice just this lesson's topics."
- Certificates / badges / gamification.
- Teacher-assigned lessons.
- Offline reading / mobile-specific UI (Phase 4).

---

## Dependencies

- `gray-matter` — YAML frontmatter parsing (new).
- `react-markdown` + `remark-gfm` + `rehype-highlight` — markdown rendering with GFM tables and syntax-highlighted code (verify existing; add if absent).
- `server-only` — Next.js package that throws at build time if imported from client components (new if not already present via Next defaults).
- `zod` — already in project.
- `zustand` — already in project; uses `persist` middleware for the draft store.

---

## Architecture diagram

```
┌────────────────────────┐
│  content/lessons/*.md  │   authored by admin, committed to repo
└────────┬───────────────┘
         │  pnpm sync-lessons (advisory lock + transaction)
         ▼
┌────────────────────────┐
│   lessons table (DB)   │   registry: id, category_id, slug, order, content_hash, quiz_hash, deleted_at
└────────┬───────────────┘
         │  FK (on delete restrict)
         ▼
┌────────────────────────┐    ┌──────────────────────────────┐
│  lesson_reads (DB)     │    │ lesson_quiz_attempts (DB)    │
│  user RLS (own rows)   │    │ select: own rows             │
│                        │    │ insert: service role only    │
└────────────────────────┘    └──────────────────────────────┘

Runtime read path:
  Server Component
    ├── loader-public.ts (no answers)  ← no client import possible
    ├── loader-server-only.ts ("server-only") for submit/results paths
    └── hydrator → useLessonProgressStore (merge hydration)

Runtime quiz path:
  /quiz page
    ├── useQuizDraftStore (localStorage, gated by useHasHydrated)
    └── submitQuizAttempt → rate limit → Zod → server answer key → service-role insert

Results path:
  /results page
    └── getResultsView(attemptId) server action → loader-server-only → banner if hashDrifted
```
