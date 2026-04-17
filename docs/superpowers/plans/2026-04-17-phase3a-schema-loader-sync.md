# Phase 3a — Schema, Loader, Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the data plumbing for Phase 3 Lessons — DB schema, RLS, filesystem-to-DB sync, and the two lesson loaders (public + server-only) — with zero student-facing UI.

**Architecture:** Lesson content lives in `content/lessons/**/*.md` as the source of truth. A `lessons` table in Supabase mirrors metadata and is updated by a manually-run sync script protected by a Postgres advisory lock. Two loader modules enforce a hard boundary: `loader-public.ts` never exposes answers or explanations; `loader-server-only.ts` uses Next.js's `server-only` package so an accidental client import throws at build time.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Supabase (Postgres + RLS), Zod, `gray-matter` (YAML frontmatter), Node `crypto` (SHA-256), Vitest (new — tests), `tsx` (new — script runner), `server-only` package.

**Spec reference:** `docs/superpowers/specs/2026-04-17-phase3-lessons-design.md`

---

## File Structure

Files created by this phase and their responsibilities:

| File | Responsibility |
|---|---|
| `supabase/migrations/00005_lessons.sql` | Creates `lessons`, `lesson_reads`, `lesson_quiz_attempts` tables + indexes + RLS policies |
| `src/types/database.ts` | Regenerated to include new tables (modified) |
| `src/lib/lessons/schema.ts` | Zod schema for lesson frontmatter |
| `src/lib/lessons/hash.ts` | `computeContentHash` + `computeQuizHash` helpers |
| `src/lib/lessons/loader-public.ts` | Filesystem → parsed lesson with no answers. In-memory cache invalidated by DB hash mismatch. |
| `src/lib/lessons/loader-server-only.ts` | Filesystem → parsed lesson with answers + explanations. `import "server-only"` prevents client imports. |
| `src/lib/lessons/parse.ts` | Shared parser used by both loaders and the sync script |
| `scripts/sync-lessons.ts` | Walks filesystem, validates, upserts via service-role client, with advisory lock |
| `content/lessons/README.md` | Authoring conventions for admins |
| `content/lessons/software-engineering/01-software-development-lifecycle.md` | First real lesson, proves the pipeline end-to-end |
| `vitest.config.ts` | Test runner config |
| `src/lib/lessons/__tests__/*.test.ts` | Unit tests colocated under lesson library |
| `package.json` | Modified: add `vitest`, `tsx`, `gray-matter`, `server-only` + scripts |
| `next.config.ts` | Modified: add `experimental.outputFileTracingIncludes` so content ships to serverless |

Design rationale: `parse.ts` is the single source of truth for "filesystem → validated lesson object." Both loaders and the sync script depend on it. That's where filename-slug extraction, frontmatter parsing, hashing, and Zod validation live. The two loaders are thin wrappers that narrow the return type differently.

---

## Task 1: Install dependencies and configure Vitest

**Goal:** Set up the toolchain for all remaining tasks.

**Files:**
- Modify: `/Users/johnivanpuayap/hiraya/package.json`
- Create: `/Users/johnivanpuayap/hiraya/vitest.config.ts`

- [ ] **Step 1.1: Install runtime dependencies**

Run:
```bash
npm install gray-matter server-only
```

Expected: `gray-matter` and `server-only` added to `dependencies` in `package.json`.

- [ ] **Step 1.2: Install dev dependencies**

Run:
```bash
npm install -D vitest @vitest/coverage-v8 tsx
```

Expected: `vitest`, `@vitest/coverage-v8`, `tsx` added to `devDependencies`.

- [ ] **Step 1.3: Add scripts to package.json**

Edit `package.json` — inside the `"scripts"` object, add these lines (keep existing `dev`, `build`, `start`, `lint`):

```json
"test": "vitest run",
"test:watch": "vitest",
"sync-lessons": "tsx scripts/sync-lessons.ts"
```

- [ ] **Step 1.4: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 1.5: Verify test runner boots**

Run:
```bash
npx vitest run --passWithNoTests
```

Expected: exits 0 with "No test files found, exiting with code 0" (or similar). No errors.

- [ ] **Step 1.6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "add vitest, tsx, gray-matter, server-only dependencies"
```

---

## Task 2: Zod frontmatter schema

**Goal:** Define and test the schema that validates every lesson's YAML frontmatter.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/schema.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/schema.test.ts`

- [ ] **Step 2.1: Write failing tests**

Create `src/lib/lessons/__tests__/schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { lessonFrontmatterSchema } from "../schema";

describe("lessonFrontmatterSchema", () => {
  const validFrontmatter = {
    title: "Sorting Algorithms",
    category_slug: "algorithms",
    order: 1,
    estimated_minutes: 15,
    quiz: [
      {
        prompt: "What is O(n^2)?",
        options: [
          { text: "Linear" },
          { text: "Quadratic", correct: true },
          { text: "Constant" },
        ],
        explanation: "Quadratic grows with the square of n.",
      },
    ],
  };

  it("accepts a valid lesson", () => {
    expect(() => lessonFrontmatterSchema.parse(validFrontmatter)).not.toThrow();
  });

  it("requires title", () => {
    const { title, ...rest } = validFrontmatter;
    expect(() => lessonFrontmatterSchema.parse(rest)).toThrow();
  });

  it("requires category_slug", () => {
    const { category_slug, ...rest } = validFrontmatter;
    expect(() => lessonFrontmatterSchema.parse(rest)).toThrow();
  });

  it("requires order", () => {
    const { order, ...rest } = validFrontmatter;
    expect(() => lessonFrontmatterSchema.parse(rest)).toThrow();
  });

  it("allows missing estimated_minutes", () => {
    const { estimated_minutes, ...rest } = validFrontmatter;
    expect(() => lessonFrontmatterSchema.parse(rest)).not.toThrow();
  });

  it("rejects empty quiz", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validFrontmatter, quiz: [] })
    ).toThrow();
  });

  it("rejects a question with only one option", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [{ text: "only", correct: true }],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects a question with more than six options", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [
              { text: "a" }, { text: "b" }, { text: "c" },
              { text: "d" }, { text: "e" }, { text: "f" },
              { text: "g", correct: true },
            ],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects a question with zero correct options", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [{ text: "a" }, { text: "b" }],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects a question with multiple correct options", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [
              { text: "a", correct: true },
              { text: "b", correct: true },
            ],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("requires explanation on every question", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [{ text: "a" }, { text: "b", correct: true }],
          },
        ],
      })
    ).toThrow();
  });
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/schema.test.ts
```

Expected: FAIL — "Cannot find module '../schema'" or all tests fail because the module doesn't exist.

- [ ] **Step 2.3: Implement schema**

Create `src/lib/lessons/schema.ts`:

```typescript
import { z } from "zod";

const lessonQuizOptionSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean().optional(),
});

const lessonQuizQuestionSchema = z
  .object({
    prompt: z.string().min(1),
    options: z.array(lessonQuizOptionSchema).min(2).max(6),
    explanation: z.string().min(1),
  })
  .refine(
    (q) => q.options.filter((o) => o.correct === true).length === 1,
    { message: "quiz question must have exactly one option with correct: true" }
  );

export const lessonFrontmatterSchema = z.object({
  title: z.string().min(1),
  category_slug: z.string().min(1),
  order: z.number().int().nonnegative(),
  estimated_minutes: z.number().int().positive().optional(),
  quiz: z.array(lessonQuizQuestionSchema).min(1),
});

export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;
export type LessonQuizQuestion = z.infer<typeof lessonQuizQuestionSchema>;
export type LessonQuizOption = z.infer<typeof lessonQuizOptionSchema>;
```

- [ ] **Step 2.4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/schema.test.ts
```

Expected: All 11 tests PASS.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/lessons/schema.ts src/lib/lessons/__tests__/schema.test.ts
git commit -m "add Zod schema for lesson frontmatter"
```

---

## Task 3: Hash utilities

**Goal:** `computeContentHash` and `computeQuizHash` — stable SHA-256 digests used for cache invalidation and attempt snapshotting.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/hash.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/hash.test.ts`

- [ ] **Step 3.1: Write failing tests**

Create `src/lib/lessons/__tests__/hash.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeContentHash, computeQuizHash } from "../hash";
import type { LessonFrontmatter } from "../schema";

const baseFrontmatter: LessonFrontmatter = {
  title: "Sorting",
  category_slug: "algorithms",
  order: 1,
  estimated_minutes: 10,
  quiz: [
    {
      prompt: "What is O(n^2)?",
      options: [
        { text: "Linear" },
        { text: "Quadratic", correct: true },
      ],
      explanation: "Squared growth.",
    },
  ],
};

const baseBody = "# Sorting\n\nBody content here.";

describe("computeContentHash", () => {
  it("is stable for identical input", () => {
    const a = computeContentHash(baseFrontmatter, baseBody);
    const b = computeContentHash(baseFrontmatter, baseBody);
    expect(a).toBe(b);
  });

  it("changes when body changes", () => {
    const a = computeContentHash(baseFrontmatter, baseBody);
    const b = computeContentHash(baseFrontmatter, baseBody + "\nmore");
    expect(a).not.toBe(b);
  });

  it("changes when a frontmatter field changes", () => {
    const a = computeContentHash(baseFrontmatter, baseBody);
    const b = computeContentHash({ ...baseFrontmatter, title: "Other" }, baseBody);
    expect(a).not.toBe(b);
  });

  it("changes when an explanation changes", () => {
    const a = computeContentHash(baseFrontmatter, baseBody);
    const withEditedExplanation: LessonFrontmatter = {
      ...baseFrontmatter,
      quiz: [{ ...baseFrontmatter.quiz[0], explanation: "A different explanation." }],
    };
    const b = computeContentHash(withEditedExplanation, baseBody);
    expect(a).not.toBe(b);
  });
});

describe("computeQuizHash", () => {
  it("is stable for identical quiz", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const b = computeQuizHash(baseFrontmatter.quiz);
    expect(a).toBe(b);
  });

  it("is UNCHANGED when only an explanation changes", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const b = computeQuizHash([
      { ...baseFrontmatter.quiz[0], explanation: "A different explanation." },
    ]);
    expect(a).toBe(b);
  });

  it("changes when a prompt changes", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const b = computeQuizHash([{ ...baseFrontmatter.quiz[0], prompt: "Different?" }]);
    expect(a).not.toBe(b);
  });

  it("changes when an option text changes", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const q = baseFrontmatter.quiz[0];
    const b = computeQuizHash([
      { ...q, options: [{ text: "Changed" }, { text: "Quadratic", correct: true }] },
    ]);
    expect(a).not.toBe(b);
  });

  it("changes when the correct option moves", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const b = computeQuizHash([
      {
        ...baseFrontmatter.quiz[0],
        options: [
          { text: "Linear", correct: true },
          { text: "Quadratic" },
        ],
      },
    ]);
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/hash.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3.3: Implement hash helpers**

Create `src/lib/lessons/hash.ts`:

```typescript
import { createHash } from "node:crypto";

import type { LessonFrontmatter, LessonQuizQuestion } from "./schema";

/**
 * Hash of everything that affects lesson rendering — frontmatter + body.
 * A change here invalidates the in-memory loader cache.
 */
export function computeContentHash(
  frontmatter: LessonFrontmatter,
  body: string,
): string {
  return sha256(canonicalize(frontmatter) + "\n" + body);
}

/**
 * Hash of the quiz-answering surface only — prompts, options, correct flags.
 * Does NOT include explanations, so explanation-only edits leave drafts intact.
 */
export function computeQuizHash(quiz: LessonQuizQuestion[]): string {
  const shape = quiz.map((q) => ({
    prompt: q.prompt,
    options: q.options.map((o) => ({
      text: o.text,
      correct: o.correct === true,
    })),
  }));
  return sha256(canonicalize(shape));
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Canonicalize by sorting object keys recursively so that the hash is
 * independent of YAML key ordering.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]));
  return "{" + parts.join(",") + "}";
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/hash.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/lessons/hash.ts src/lib/lessons/__tests__/hash.test.ts
git commit -m "add content and quiz hash helpers for lessons"
```

---

## Task 4: Database migration for lessons tables + RLS

**Goal:** Create the three tables, indexes, and RLS policies. Apply locally and verify.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/supabase/migrations/00005_lessons.sql`

- [ ] **Step 4.1: Write the migration**

Create `supabase/migrations/00005_lessons.sql`:

```sql
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

-- No INSERT/UPDATE/DELETE policies defined → writes blocked for all non-service-role clients.

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

-- (No UPDATE policy — lesson_reads has no mutable fields beyond read_at, which is set by insert default.)

-- lesson_quiz_attempts: users can read own rows; writes only via service role (server action)
CREATE POLICY "Users can read own quiz attempts"
  ON public.lesson_quiz_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies → writes blocked for all non-service-role clients.
```

- [ ] **Step 4.2: Apply the migration to local Supabase**

Ensure the local Supabase stack is running:
```bash
npx supabase start
```

Then apply the new migration (resets the local DB to a clean state, re-runs all migrations):
```bash
npx supabase db reset
```

Expected: migrations run in order, ending with `Applying migration 00005_lessons.sql...` and no errors.

- [ ] **Step 4.3: Verify tables exist**

Run:
```bash
npx supabase db diff --schema public | head -80
```

Expected: no diff (local DB matches migrations). Alternatively, open the local Supabase Studio (URL printed by `supabase start`) and confirm `lessons`, `lesson_reads`, `lesson_quiz_attempts` appear in the `public` schema.

- [ ] **Step 4.4: Regenerate database types**

Run:
```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Expected: `src/types/database.ts` now contains `lessons`, `lesson_reads`, `lesson_quiz_attempts` under `public.Tables`.

- [ ] **Step 4.5: Commit**

```bash
git add supabase/migrations/00005_lessons.sql src/types/database.ts
git commit -m "add lessons, lesson_reads, lesson_quiz_attempts schema + RLS"
```

---

## Task 5: Shared parser — filesystem → validated lesson

**Goal:** A pure function that reads a markdown file, parses frontmatter, validates with Zod, computes both hashes, and returns the parsed lesson plus a `slug` derived from the relative path. This is the shared dependency for both loaders and the sync script.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/parse.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/parse.test.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/fixtures/valid-lesson.md`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/fixtures/invalid-lesson.md`

- [ ] **Step 5.1: Create test fixtures**

Create `src/lib/lessons/__tests__/fixtures/valid-lesson.md`:

```markdown
---
title: "Sorting Algorithms"
category_slug: "algorithms"
order: 1
estimated_minutes: 10
quiz:
  - prompt: "What is O(n^2)?"
    options:
      - text: "Linear"
      - text: "Quadratic"
        correct: true
    explanation: "Quadratic grows with the square of n."
---

# Sorting Algorithms

This lesson teaches sorting.
```

Create `src/lib/lessons/__tests__/fixtures/invalid-lesson.md`:

```markdown
---
title: "Broken lesson"
category_slug: "algorithms"
order: 1
quiz:
  - prompt: "x"
    options:
      - text: "a"
      - text: "b"
    explanation: "e"
---

# Body
```

(The `invalid-lesson.md` fails because no option is marked correct.)

- [ ] **Step 5.2: Write failing tests**

Create `src/lib/lessons/__tests__/parse.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import path from "node:path";
import { parseLessonFile } from "../parse";

const FIXTURES = path.join(__dirname, "fixtures");

describe("parseLessonFile", () => {
  it("parses a valid lesson", async () => {
    const result = await parseLessonFile(
      path.join(FIXTURES, "valid-lesson.md"),
      FIXTURES,
    );
    expect(result.slug).toBe("valid-lesson");
    expect(result.frontmatter.title).toBe("Sorting Algorithms");
    expect(result.frontmatter.category_slug).toBe("algorithms");
    expect(result.body).toContain("# Sorting Algorithms");
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.quizHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws on invalid frontmatter with a file path in the message", async () => {
    const file = path.join(FIXTURES, "invalid-lesson.md");
    await expect(parseLessonFile(file, FIXTURES)).rejects.toThrow(
      /invalid-lesson\.md/,
    );
  });

  it("derives slug from the path relative to the root", async () => {
    // Simulate a nested path by passing a parent dir
    const parent = path.resolve(FIXTURES, "..");
    const result = await parseLessonFile(
      path.join(FIXTURES, "valid-lesson.md"),
      parent,
    );
    expect(result.slug).toBe("fixtures/valid-lesson");
  });
});
```

- [ ] **Step 5.3: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/parse.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 5.4: Implement parser**

Create `src/lib/lessons/parse.ts`:

```typescript
import { readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { computeContentHash, computeQuizHash } from "./hash";
import { lessonFrontmatterSchema } from "./schema";
import type { LessonFrontmatter } from "./schema";

export interface ParsedLesson {
  slug: string;
  frontmatter: LessonFrontmatter;
  body: string;
  contentHash: string;
  quizHash: string;
}

export async function parseLessonFile(
  absoluteFilePath: string,
  rootDir: string,
): Promise<ParsedLesson> {
  const raw = await readFile(absoluteFilePath, "utf8");
  const parsed = matter(raw);

  const result = lessonFrontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in ${absoluteFilePath}:\n${JSON.stringify(result.error.flatten(), null, 2)}`,
    );
  }

  const frontmatter = result.data;
  const body = parsed.content;

  const relative = path.relative(rootDir, absoluteFilePath);
  const slug = relative.replace(/\.md$/, "").split(path.sep).join("/");

  return {
    slug,
    frontmatter,
    body,
    contentHash: computeContentHash(frontmatter, body),
    quizHash: computeQuizHash(frontmatter.quiz),
  };
}
```

- [ ] **Step 5.5: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/parse.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5.6: Commit**

```bash
git add src/lib/lessons/parse.ts src/lib/lessons/__tests__/parse.test.ts src/lib/lessons/__tests__/fixtures
git commit -m "add lesson file parser with frontmatter validation"
```

---

## Task 6: Public loader (no answers)

**Goal:** `getLessonForReader(slug)` returns the body + questions with prompts and option text only. The return type has no `correct` flag and no `explanation` field — narrowed at the module boundary so the answer key cannot leak through this function.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/loader-public.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/loader-public.test.ts`

- [ ] **Step 6.1: Write failing tests**

Create `src/lib/lessons/__tests__/loader-public.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import path from "node:path";
import { getLessonForReader } from "../loader-public";

const FIXTURES = path.join(__dirname, "fixtures");

describe("getLessonForReader", () => {
  it("returns the body and quiz prompts", async () => {
    const lesson = await getLessonForReader("valid-lesson", FIXTURES);
    expect(lesson.slug).toBe("valid-lesson");
    expect(lesson.title).toBe("Sorting Algorithms");
    expect(lesson.body).toContain("# Sorting Algorithms");
    expect(lesson.quiz).toHaveLength(1);
    expect(lesson.quiz[0].prompt).toBe("What is O(n^2)?");
    expect(lesson.quiz[0].options).toHaveLength(2);
    expect(lesson.quiz[0].options[0].text).toBe("Linear");
  });

  it("does not include the correct flag on options", async () => {
    const lesson = await getLessonForReader("valid-lesson", FIXTURES);
    for (const q of lesson.quiz) {
      for (const o of q.options) {
        expect(o).not.toHaveProperty("correct");
      }
    }
  });

  it("does not include explanations", async () => {
    const lesson = await getLessonForReader("valid-lesson", FIXTURES);
    for (const q of lesson.quiz) {
      expect(q).not.toHaveProperty("explanation");
    }
  });

  it("includes content and quiz hashes", async () => {
    const lesson = await getLessonForReader("valid-lesson", FIXTURES);
    expect(lesson.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lesson.quizHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 6.2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/loader-public.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement public loader**

Create `src/lib/lessons/loader-public.ts`:

```typescript
import path from "node:path";

import { parseLessonFile } from "./parse";

export interface PublicQuizOption {
  text: string;
}

export interface PublicQuizQuestion {
  prompt: string;
  options: PublicQuizOption[];
}

export interface PublicLesson {
  slug: string;
  title: string;
  categorySlug: string;
  order: number;
  estimatedMinutes?: number;
  body: string;
  quiz: PublicQuizQuestion[];
  contentHash: string;
  quizHash: string;
}

const DEFAULT_ROOT = path.join(process.cwd(), "content", "lessons");

/**
 * Loads a lesson stripped of correct-answer info and explanations.
 * Safe for any server component to call.
 *
 * @param slug e.g. "algorithms/01-sorting"
 * @param rootDir optional override (used by tests)
 */
export async function getLessonForReader(
  slug: string,
  rootDir: string = DEFAULT_ROOT,
): Promise<PublicLesson> {
  const absoluteFilePath = path.join(rootDir, `${slug}.md`);
  const parsed = await parseLessonFile(absoluteFilePath, rootDir);

  return {
    slug: parsed.slug,
    title: parsed.frontmatter.title,
    categorySlug: parsed.frontmatter.category_slug,
    order: parsed.frontmatter.order,
    estimatedMinutes: parsed.frontmatter.estimated_minutes,
    body: parsed.body,
    quiz: parsed.frontmatter.quiz.map((q) => ({
      prompt: q.prompt,
      options: q.options.map((o) => ({ text: o.text })),
    })),
    contentHash: parsed.contentHash,
    quizHash: parsed.quizHash,
  };
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/loader-public.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/lessons/loader-public.ts src/lib/lessons/__tests__/loader-public.test.ts
git commit -m "add public lesson loader with no answer key exposure"
```

---

## Task 7: Server-only loader (with answers)

**Goal:** `getLessonForGrading(slug)` returns the full parsed lesson including answers and explanations. Marked `import "server-only"` so accidental client imports fail at build.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/loader-server-only.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/loader-server-only.test.ts`

- [ ] **Step 7.1: Write failing tests**

Create `src/lib/lessons/__tests__/loader-server-only.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import path from "node:path";
import { getLessonForGrading } from "../loader-server-only";

const FIXTURES = path.join(__dirname, "fixtures");

describe("getLessonForGrading", () => {
  it("returns prompts, options, correct flags, and explanations", async () => {
    const lesson = await getLessonForGrading("valid-lesson", FIXTURES);
    expect(lesson.slug).toBe("valid-lesson");
    expect(lesson.quiz).toHaveLength(1);

    const q = lesson.quiz[0];
    expect(q.prompt).toBe("What is O(n^2)?");
    expect(q.explanation).toBe("Quadratic grows with the square of n.");
    expect(q.correctIndex).toBe(1);
    expect(q.options).toEqual([
      { text: "Linear" },
      { text: "Quadratic" },
    ]);
  });

  it("includes content and quiz hashes", async () => {
    const lesson = await getLessonForGrading("valid-lesson", FIXTURES);
    expect(lesson.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lesson.quizHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

Note: vitest runs in Node env where `server-only` is allowed; the import boundary is enforced by Next's build, not by vitest.

- [ ] **Step 7.2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/loader-server-only.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7.3: Implement server-only loader**

Create `src/lib/lessons/loader-server-only.ts`:

```typescript
import "server-only";

import path from "node:path";

import { parseLessonFile } from "./parse";

export interface GradingQuizOption {
  text: string;
}

export interface GradingQuizQuestion {
  prompt: string;
  options: GradingQuizOption[];
  correctIndex: number;
  explanation: string;
}

export interface GradingLesson {
  slug: string;
  title: string;
  categorySlug: string;
  order: number;
  estimatedMinutes?: number;
  body: string;
  quiz: GradingQuizQuestion[];
  contentHash: string;
  quizHash: string;
}

const DEFAULT_ROOT = path.join(process.cwd(), "content", "lessons");

/**
 * Loads a lesson with full answer key and explanations.
 *
 * IMPORTANT: this module starts with `import "server-only"` — do NOT import
 * it from any client component or shared module that a client component
 * may reach. Client paths must use `loader-public.ts`.
 */
export async function getLessonForGrading(
  slug: string,
  rootDir: string = DEFAULT_ROOT,
): Promise<GradingLesson> {
  const absoluteFilePath = path.join(rootDir, `${slug}.md`);
  const parsed = await parseLessonFile(absoluteFilePath, rootDir);

  return {
    slug: parsed.slug,
    title: parsed.frontmatter.title,
    categorySlug: parsed.frontmatter.category_slug,
    order: parsed.frontmatter.order,
    estimatedMinutes: parsed.frontmatter.estimated_minutes,
    body: parsed.body,
    quiz: parsed.frontmatter.quiz.map((q) => {
      const correctIndex = q.options.findIndex((o) => o.correct === true);
      return {
        prompt: q.prompt,
        options: q.options.map((o) => ({ text: o.text })),
        correctIndex,
        explanation: q.explanation,
      };
    }),
    contentHash: parsed.contentHash,
    quizHash: parsed.quizHash,
  };
}
```

- [ ] **Step 7.4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/loader-server-only.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/lib/lessons/loader-server-only.ts src/lib/lessons/__tests__/loader-server-only.test.ts
git commit -m "add server-only lesson loader with answer key and explanations"
```

---

## Task 8: Loader cache + DB hash invalidation

**Goal:** Both loaders memoize parsed lessons in a module-level map in production. Before returning a cached entry, they re-check `lessons.content_hash` from the DB and invalidate on mismatch. In development (`NODE_ENV=development`), the cache is always bypassed so markdown edits show up on refresh.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/cache.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/cache.test.ts`
- Modify: `/Users/johnivanpuayap/hiraya/src/lib/lessons/loader-public.ts`
- Modify: `/Users/johnivanpuayap/hiraya/src/lib/lessons/loader-server-only.ts`

- [ ] **Step 8.1: Write failing tests for the cache**

Create `src/lib/lessons/__tests__/cache.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createLessonCache } from "../cache";

describe("lesson cache", () => {
  let parseCount: number;

  beforeEach(() => {
    parseCount = 0;
  });

  async function fakeLoad() {
    parseCount += 1;
    return { value: "parsed", contentHash: "hash-v1" };
  }

  it("returns cached value on second call when hash matches", async () => {
    const cache = createLessonCache<{ value: string; contentHash: string }>();
    const a = await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    const b = await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    expect(a).toEqual(b);
    expect(parseCount).toBe(1);
  });

  it("reloads when hash differs", async () => {
    const cache = createLessonCache<{ value: string; contentHash: string }>();
    await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    await cache.getOrLoad("slug-a", "hash-v2", fakeLoad);
    expect(parseCount).toBe(2);
  });

  it("caches per slug independently", async () => {
    const cache = createLessonCache<{ value: string; contentHash: string }>();
    await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    await cache.getOrLoad("slug-b", "hash-v1", fakeLoad);
    expect(parseCount).toBe(2);
  });

  it("bypass mode always calls loader", async () => {
    const cache = createLessonCache<{ value: string; contentHash: string }>({
      bypass: true,
    });
    await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    await cache.getOrLoad("slug-a", "hash-v1", fakeLoad);
    expect(parseCount).toBe(2);
  });
});
```

- [ ] **Step 8.2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/cache.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 8.3: Implement the cache**

Create `src/lib/lessons/cache.ts`:

```typescript
export interface LessonCacheOptions {
  bypass?: boolean;
}

export interface LessonCache<T extends { contentHash: string }> {
  getOrLoad(
    slug: string,
    currentHash: string,
    loader: () => Promise<T>,
  ): Promise<T>;
}

export function createLessonCache<T extends { contentHash: string }>(
  options: LessonCacheOptions = {},
): LessonCache<T> {
  const map = new Map<string, T>();

  return {
    async getOrLoad(slug, currentHash, loader) {
      if (options.bypass) {
        return loader();
      }
      const cached = map.get(slug);
      if (cached && cached.contentHash === currentHash) {
        return cached;
      }
      const fresh = await loader();
      map.set(slug, fresh);
      return fresh;
    },
  };
}

/**
 * Determine whether the current runtime should bypass the cache.
 * Development bypasses so edits show up without restart.
 */
export function shouldBypassCache(): boolean {
  return process.env.NODE_ENV === "development";
}
```

- [ ] **Step 8.4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/cache.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 8.5: Wire public loader into the cache**

Replace `src/lib/lessons/loader-public.ts` with:

```typescript
import path from "node:path";

import { createAdminClient } from "@/lib/supabase/admin";

import { createLessonCache, shouldBypassCache } from "./cache";
import { parseLessonFile } from "./parse";

export interface PublicQuizOption {
  text: string;
}

export interface PublicQuizQuestion {
  prompt: string;
  options: PublicQuizOption[];
}

export interface PublicLesson {
  slug: string;
  title: string;
  categorySlug: string;
  order: number;
  estimatedMinutes?: number;
  body: string;
  quiz: PublicQuizQuestion[];
  contentHash: string;
  quizHash: string;
}

const DEFAULT_ROOT = path.join(process.cwd(), "content", "lessons");

const cache = createLessonCache<PublicLesson>({ bypass: shouldBypassCache() });

export async function getLessonForReader(
  slug: string,
  rootDir: string = DEFAULT_ROOT,
): Promise<PublicLesson> {
  const currentHash = await fetchContentHashFromDB(slug);
  return cache.getOrLoad(slug, currentHash, () => loadFromDisk(slug, rootDir));
}

async function loadFromDisk(slug: string, rootDir: string): Promise<PublicLesson> {
  const absoluteFilePath = path.join(rootDir, `${slug}.md`);
  const parsed = await parseLessonFile(absoluteFilePath, rootDir);

  return {
    slug: parsed.slug,
    title: parsed.frontmatter.title,
    categorySlug: parsed.frontmatter.category_slug,
    order: parsed.frontmatter.order,
    estimatedMinutes: parsed.frontmatter.estimated_minutes,
    body: parsed.body,
    quiz: parsed.frontmatter.quiz.map((q) => ({
      prompt: q.prompt,
      options: q.options.map((o) => ({ text: o.text })),
    })),
    contentHash: parsed.contentHash,
    quizHash: parsed.quizHash,
  };
}

async function fetchContentHashFromDB(slug: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("content_hash")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error(`Lesson not found in DB: ${slug}`);
  }
  return data.content_hash;
}
```

- [ ] **Step 8.6: Wire server-only loader into the cache**

Replace `src/lib/lessons/loader-server-only.ts` with:

```typescript
import "server-only";

import path from "node:path";

import { createAdminClient } from "@/lib/supabase/admin";

import { createLessonCache, shouldBypassCache } from "./cache";
import { parseLessonFile } from "./parse";

export interface GradingQuizOption {
  text: string;
}

export interface GradingQuizQuestion {
  prompt: string;
  options: GradingQuizOption[];
  correctIndex: number;
  explanation: string;
}

export interface GradingLesson {
  slug: string;
  title: string;
  categorySlug: string;
  order: number;
  estimatedMinutes?: number;
  body: string;
  quiz: GradingQuizQuestion[];
  contentHash: string;
  quizHash: string;
}

const DEFAULT_ROOT = path.join(process.cwd(), "content", "lessons");

const cache = createLessonCache<GradingLesson>({ bypass: shouldBypassCache() });

export async function getLessonForGrading(
  slug: string,
  rootDir: string = DEFAULT_ROOT,
): Promise<GradingLesson> {
  const currentHash = await fetchContentHashFromDB(slug);
  return cache.getOrLoad(slug, currentHash, () => loadFromDisk(slug, rootDir));
}

async function loadFromDisk(slug: string, rootDir: string): Promise<GradingLesson> {
  const absoluteFilePath = path.join(rootDir, `${slug}.md`);
  const parsed = await parseLessonFile(absoluteFilePath, rootDir);

  return {
    slug: parsed.slug,
    title: parsed.frontmatter.title,
    categorySlug: parsed.frontmatter.category_slug,
    order: parsed.frontmatter.order,
    estimatedMinutes: parsed.frontmatter.estimated_minutes,
    body: parsed.body,
    quiz: parsed.frontmatter.quiz.map((q) => {
      const correctIndex = q.options.findIndex((o) => o.correct === true);
      return {
        prompt: q.prompt,
        options: q.options.map((o) => ({ text: o.text })),
        correctIndex,
        explanation: q.explanation,
      };
    }),
    contentHash: parsed.contentHash,
    quizHash: parsed.quizHash,
  };
}

async function fetchContentHashFromDB(slug: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("content_hash")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    throw new Error(`Lesson not found in DB: ${slug}`);
  }
  return data.content_hash;
}
```

- [ ] **Step 8.7: Update loader tests to pass a mock or use the fixtures root + skip DB check**

The loader tests from Tasks 6 and 7 now call `fetchContentHashFromDB`, which requires a live DB. For those unit tests, we restructure: split the pure-disk path into `loadFromDisk` (already done) and keep the cache+DB wiring in the exported function. Test only `loadFromDisk` directly.

Modify `src/lib/lessons/__tests__/loader-public.test.ts` — replace the imports and calls:

```typescript
import { describe, it, expect } from "vitest";
import path from "node:path";
import { getLessonForReader, _loadFromDiskForTest } from "../loader-public";

const FIXTURES = path.join(__dirname, "fixtures");

describe("loader-public loadFromDisk", () => {
  it("returns the body and quiz prompts", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    expect(lesson.slug).toBe("valid-lesson");
    expect(lesson.title).toBe("Sorting Algorithms");
    expect(lesson.body).toContain("# Sorting Algorithms");
    expect(lesson.quiz).toHaveLength(1);
    expect(lesson.quiz[0].prompt).toBe("What is O(n^2)?");
    expect(lesson.quiz[0].options).toHaveLength(2);
  });

  it("does not include the correct flag on options", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    for (const q of lesson.quiz) {
      for (const o of q.options) {
        expect(o).not.toHaveProperty("correct");
      }
    }
  });

  it("does not include explanations", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    for (const q of lesson.quiz) {
      expect(q).not.toHaveProperty("explanation");
    }
  });

  it("includes content and quiz hashes", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    expect(lesson.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lesson.quizHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

And export `loadFromDisk` as a test-only alias by adding to the end of `src/lib/lessons/loader-public.ts`:

```typescript
// Internal export for unit tests — do not use from application code.
export { loadFromDisk as _loadFromDiskForTest };
```

Modify `src/lib/lessons/__tests__/loader-server-only.test.ts` similarly:

```typescript
import { describe, it, expect } from "vitest";
import path from "node:path";
import { _loadFromDiskForTest } from "../loader-server-only";

const FIXTURES = path.join(__dirname, "fixtures");

describe("loader-server-only loadFromDisk", () => {
  it("returns prompts, options, correct flags, and explanations", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    expect(lesson.slug).toBe("valid-lesson");
    expect(lesson.quiz).toHaveLength(1);
    const q = lesson.quiz[0];
    expect(q.prompt).toBe("What is O(n^2)?");
    expect(q.explanation).toBe("Quadratic grows with the square of n.");
    expect(q.correctIndex).toBe(1);
    expect(q.options).toEqual([{ text: "Linear" }, { text: "Quadratic" }]);
  });

  it("includes content and quiz hashes", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    expect(lesson.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lesson.quizHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

Add the same test-only export at the end of `src/lib/lessons/loader-server-only.ts`:

```typescript
export { loadFromDisk as _loadFromDiskForTest };
```

- [ ] **Step 8.8: Run all loader and cache tests**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/cache.test.ts src/lib/lessons/__tests__/loader-public.test.ts src/lib/lessons/__tests__/loader-server-only.test.ts
```

Expected: all tests PASS (4 cache + 4 public + 2 server-only = 10).

- [ ] **Step 8.9: Commit**

```bash
git add src/lib/lessons/cache.ts src/lib/lessons/loader-public.ts src/lib/lessons/loader-server-only.ts src/lib/lessons/__tests__/cache.test.ts src/lib/lessons/__tests__/loader-public.test.ts src/lib/lessons/__tests__/loader-server-only.test.ts
git commit -m "add in-memory lesson cache with DB hash invalidation"
```

---

## Task 9: Sync script — pure parsing phase

**Goal:** A function that walks `content/lessons/**` and returns a list of `ParsedLesson`s without touching the DB. Tested in isolation with a fixture tree.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/walk.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/walk.test.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/fixtures/tree/category-a/01-one.md`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/fixtures/tree/category-a/02-two.md`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/fixtures/tree/category-b/01-three.md`

- [ ] **Step 9.1: Create test fixture tree**

Create the three fixture files with minimal valid frontmatter. Each file follows this template, substituting the values:

`src/lib/lessons/__tests__/fixtures/tree/category-a/01-one.md`:
```markdown
---
title: "One"
category_slug: "category-a"
order: 1
quiz:
  - prompt: "Q?"
    options:
      - text: "a"
      - text: "b"
        correct: true
    explanation: "x"
---

Body of one.
```

`src/lib/lessons/__tests__/fixtures/tree/category-a/02-two.md`:
```markdown
---
title: "Two"
category_slug: "category-a"
order: 2
quiz:
  - prompt: "Q?"
    options:
      - text: "a"
      - text: "b"
        correct: true
    explanation: "x"
---

Body of two.
```

`src/lib/lessons/__tests__/fixtures/tree/category-b/01-three.md`:
```markdown
---
title: "Three"
category_slug: "category-b"
order: 1
quiz:
  - prompt: "Q?"
    options:
      - text: "a"
      - text: "b"
        correct: true
    explanation: "x"
---

Body of three.
```

- [ ] **Step 9.2: Write failing test**

Create `src/lib/lessons/__tests__/walk.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import path from "node:path";
import { walkLessons } from "../walk";

const TREE = path.join(__dirname, "fixtures", "tree");

describe("walkLessons", () => {
  it("parses all markdown files under the root", async () => {
    const lessons = await walkLessons(TREE);
    expect(lessons).toHaveLength(3);

    const slugs = lessons.map((l) => l.slug).sort();
    expect(slugs).toEqual([
      "category-a/01-one",
      "category-a/02-two",
      "category-b/01-three",
    ]);
  });

  it("returns lessons with validated frontmatter and hashes", async () => {
    const lessons = await walkLessons(TREE);
    for (const lesson of lessons) {
      expect(lesson.frontmatter.title).toBeDefined();
      expect(lesson.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(lesson.quizHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
```

- [ ] **Step 9.3: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/walk.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 9.4: Implement walkLessons**

Create `src/lib/lessons/walk.ts`:

```typescript
import { readdir } from "node:fs/promises";
import path from "node:path";

import { parseLessonFile } from "./parse";
import type { ParsedLesson } from "./parse";

/**
 * Recursively walks `rootDir` and returns all parsed .md lessons.
 * Any invalid frontmatter throws — failure is loud and complete.
 */
export async function walkLessons(rootDir: string): Promise<ParsedLesson[]> {
  const files = await collectMarkdownFiles(rootDir);
  return Promise.all(files.map((file) => parseLessonFile(file, rootDir)));
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(full);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      results.push(full);
    }
  }
  return results;
}
```

- [ ] **Step 9.5: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/walk.test.ts
```

Expected: All 2 tests PASS.

- [ ] **Step 9.6: Commit**

```bash
git add src/lib/lessons/walk.ts src/lib/lessons/__tests__/walk.test.ts src/lib/lessons/__tests__/fixtures/tree
git commit -m "add recursive lesson walker"
```

---

## Task 10: Sync script — DB write logic (without advisory lock yet)

**Goal:** A function that accepts the parsed lessons plus a Supabase client, and applies the upsert + soft-delete to the DB. Tested against the local Supabase instance.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/sync.ts`
- Create: `/Users/johnivanpuayap/hiraya/src/lib/lessons/__tests__/sync.test.ts`

- [ ] **Step 10.1: Ensure local Supabase is running with the new migration**

Run:
```bash
npx supabase status
```

If not running:
```bash
npx supabase start
npx supabase db reset
```

- [ ] **Step 10.2: Seed a test category**

Seed a category that tests can rely on by creating a seed script helper. For now, run this one-off SQL via the admin client in a setup step. Actually, add it to migration 00001 is risky — use a separate test-setup call inside the test file.

Create a small helper in the test (do NOT create a new migration). The test will insert `category-a` and `category-b` rows directly via service role at `beforeAll`.

- [ ] **Step 10.3: Write failing integration test**

Create `src/lib/lessons/__tests__/sync.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { applyLessonSync } from "../sync";
import { walkLessons } from "../walk";

const TREE = path.join(__dirname, "fixtures", "tree");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let admin: SupabaseClient;
let categoryAId: string;
let categoryBId: string;

beforeAll(async () => {
  if (!SERVICE_ROLE) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY required for sync integration tests. " +
      "Run `npx supabase status` and copy the service_role key into .env.local."
    );
  }
  admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure test categories exist
  const upserts = [
    { name: "category-a", display_name: "Category A", exam_weight: 0.0 },
    { name: "category-b", display_name: "Category B", exam_weight: 0.0 },
  ];
  for (const c of upserts) {
    const { data } = await admin
      .from("categories")
      .upsert(c, { onConflict: "name" })
      .select("id")
      .single();
    if (c.name === "category-a" && data) categoryAId = data.id;
    if (c.name === "category-b" && data) categoryBId = data.id;
  }

  // Clean slate for lessons
  await admin
    .from("lessons")
    .delete()
    .in("slug", [
      "category-a/01-one",
      "category-a/02-two",
      "category-b/01-three",
    ]);
});

afterAll(async () => {
  await admin
    .from("lessons")
    .delete()
    .in("slug", [
      "category-a/01-one",
      "category-a/02-two",
      "category-b/01-three",
    ]);
});

describe("applyLessonSync", () => {
  it("inserts new lessons on first run", async () => {
    const parsed = await walkLessons(TREE);
    const summary = await applyLessonSync(admin, parsed, { allowOrphanedProgress: false });
    expect(summary.inserted).toBe(3);
    expect(summary.updated).toBe(0);
    expect(summary.softDeleted).toBe(0);

    const { data } = await admin
      .from("lessons")
      .select("slug, title, category_id, content_hash, deleted_at")
      .in("slug", ["category-a/01-one", "category-b/01-three"]);
    expect(data?.length).toBe(2);
  });

  it("detects unchanged lessons as no-op on second run", async () => {
    const parsed = await walkLessons(TREE);
    const summary = await applyLessonSync(admin, parsed, { allowOrphanedProgress: false });
    expect(summary.inserted).toBe(0);
    expect(summary.updated).toBe(0);
    expect(summary.unchanged).toBe(3);
  });

  it("soft-deletes lessons whose files disappeared", async () => {
    // Simulate: filesystem only has one of the three lessons now
    const parsed = await walkLessons(TREE);
    const reduced = parsed.filter((l) => l.slug === "category-a/01-one");
    const summary = await applyLessonSync(admin, reduced, { allowOrphanedProgress: true });
    expect(summary.softDeleted).toBe(2);

    const { data } = await admin
      .from("lessons")
      .select("slug, deleted_at")
      .in("slug", ["category-a/02-two", "category-b/01-three"]);
    for (const row of data ?? []) {
      expect(row.deleted_at).not.toBeNull();
    }
  });

  it("re-activates soft-deleted lessons on next run if file reappears", async () => {
    const parsed = await walkLessons(TREE);
    const summary = await applyLessonSync(admin, parsed, { allowOrphanedProgress: false });
    expect(summary.softDeleted).toBe(0);

    const { data } = await admin
      .from("lessons")
      .select("slug, deleted_at")
      .in("slug", ["category-a/02-two", "category-b/01-three"]);
    for (const row of data ?? []) {
      expect(row.deleted_at).toBeNull();
    }
  });
});
```

- [ ] **Step 10.4: Run test to verify it fails**

Ensure `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` set (copy from `npx supabase status`).

Run:
```bash
npx vitest run src/lib/lessons/__tests__/sync.test.ts
```

Expected: FAIL — `applyLessonSync` not found.

- [ ] **Step 10.5: Implement applyLessonSync**

Create `src/lib/lessons/sync.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ParsedLesson } from "./parse";

export interface SyncOptions {
  allowOrphanedProgress: boolean;
}

export interface SyncSummary {
  inserted: number;
  updated: number;
  unchanged: number;
  softDeleted: number;
  warnings: string[];
}

interface ExistingLessonRow {
  id: string;
  slug: string;
  content_hash: string;
  deleted_at: string | null;
}

export async function applyLessonSync(
  admin: SupabaseClient,
  lessons: ParsedLesson[],
  options: SyncOptions,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    softDeleted: 0,
    warnings: [],
  };

  const categorySlugs = Array.from(new Set(lessons.map((l) => l.frontmatter.category_slug)));
  const { data: categoryRows, error: catError } = await admin
    .from("categories")
    .select("id, name")
    .in("name", categorySlugs);
  if (catError) {
    throw new Error(`Failed to fetch categories: ${catError.message}`);
  }
  const categoryIdBySlug = new Map<string, string>();
  for (const row of categoryRows ?? []) {
    categoryIdBySlug.set(row.name, row.id);
  }
  const missingCategories = categorySlugs.filter((s) => !categoryIdBySlug.has(s));
  if (missingCategories.length > 0) {
    throw new Error(
      `Missing categories in DB: ${missingCategories.join(", ")}. Create them before syncing lessons.`,
    );
  }

  // Fetch all existing lessons so we can compute diffs
  const { data: existingRows, error: existingError } = await admin
    .from("lessons")
    .select("id, slug, content_hash, deleted_at");
  if (existingError) {
    throw new Error(`Failed to fetch existing lessons: ${existingError.message}`);
  }
  const existingBySlug = new Map<string, ExistingLessonRow>();
  for (const row of (existingRows ?? []) as ExistingLessonRow[]) {
    existingBySlug.set(row.slug, row);
  }

  const filesystemSlugs = new Set(lessons.map((l) => l.slug));

  // Upsert present lessons
  for (const lesson of lessons) {
    const existing = existingBySlug.get(lesson.slug);
    const categoryId = categoryIdBySlug.get(lesson.frontmatter.category_slug)!;

    if (!existing) {
      const { error } = await admin.from("lessons").insert({
        slug: lesson.slug,
        category_id: categoryId,
        title: lesson.frontmatter.title,
        order_index: lesson.frontmatter.order,
        estimated_minutes: lesson.frontmatter.estimated_minutes ?? null,
        content_hash: lesson.contentHash,
        quiz_hash: lesson.quizHash,
      });
      if (error) throw new Error(`Insert failed for ${lesson.slug}: ${error.message}`);
      summary.inserted += 1;
      continue;
    }

    const needsUpdate =
      existing.content_hash !== lesson.contentHash || existing.deleted_at !== null;

    if (needsUpdate) {
      const { error } = await admin
        .from("lessons")
        .update({
          category_id: categoryId,
          title: lesson.frontmatter.title,
          order_index: lesson.frontmatter.order,
          estimated_minutes: lesson.frontmatter.estimated_minutes ?? null,
          content_hash: lesson.contentHash,
          quiz_hash: lesson.quizHash,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(`Update failed for ${lesson.slug}: ${error.message}`);
      summary.updated += 1;
    } else {
      summary.unchanged += 1;
    }
  }

  // Soft-delete disappeared lessons
  const disappeared: string[] = [];
  for (const [slug, row] of existingBySlug.entries()) {
    if (row.deleted_at !== null) continue;
    if (!filesystemSlugs.has(slug)) disappeared.push(slug);
  }

  // Rename detection: any disappeared slug + any newly-inserted slug is suspicious
  const newSlugs = lessons
    .filter((l) => !existingBySlug.has(l.slug))
    .map((l) => l.slug);

  if (disappeared.length > 0 && newSlugs.length > 0) {
    const warning = `Possible rename detected. Disappeared: [${disappeared.join(", ")}]. New: [${newSlugs.join(", ")}]. Progress rows for disappeared slugs stay attached to the soft-deleted rows.`;
    if (!options.allowOrphanedProgress) {
      throw new Error(
        `${warning}\n\nRefusing to proceed. Re-run with --allow-orphaned-progress to soft-delete the disappeared lessons and keep their history separate from the new ones.`,
      );
    }
    summary.warnings.push(warning);
  }

  for (const slug of disappeared) {
    const { error } = await admin
      .from("lessons")
      .update({ deleted_at: new Date().toISOString() })
      .eq("slug", slug);
    if (error) throw new Error(`Soft-delete failed for ${slug}: ${error.message}`);
    summary.softDeleted += 1;
  }

  return summary;
}
```

- [ ] **Step 10.6: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/sync.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 10.7: Commit**

```bash
git add src/lib/lessons/sync.ts src/lib/lessons/__tests__/sync.test.ts
git commit -m "add lesson sync logic with soft-delete and rename detection"
```

---

## Task 11: Advisory lock wrapper via migration + RPC

**Goal:** Add a Postgres function the sync script can call via RPC to acquire/release an advisory lock, so concurrent sync runs serialize safely.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/supabase/migrations/00006_sync_lessons_lock.sql`
- Modify: `/Users/johnivanpuayap/hiraya/src/lib/lessons/sync.ts`
- Modify: `/Users/johnivanpuayap/hiraya/src/types/database.ts` (regenerated)

- [ ] **Step 11.1: Write the migration**

Create `supabase/migrations/00006_sync_lessons_lock.sql`:

```sql
-- Advisory-lock helpers for `pnpm sync-lessons` concurrency safety.
-- Two admins running the sync simultaneously will serialize: the second caller
-- waits until the first releases the lock.

-- Lock key: use hashtext of a fixed string, cast to bigint.
-- The lock is session-scoped; when the client connection ends, the lock
-- is released automatically.

CREATE OR REPLACE FUNCTION public.acquire_sync_lessons_lock()
RETURNS void AS $$
BEGIN
  PERFORM pg_advisory_lock(hashtext('sync-lessons')::bigint);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.release_sync_lessons_lock()
RETURNS void AS $$
BEGIN
  PERFORM pg_advisory_unlock(hashtext('sync-lessons')::bigint);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Only the service role should call these
REVOKE EXECUTE ON FUNCTION public.acquire_sync_lessons_lock() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_sync_lessons_lock() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_sync_lessons_lock() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_sync_lessons_lock() TO service_role;
```

- [ ] **Step 11.2: Apply the migration locally**

Run:
```bash
npx supabase db reset
```

Expected: migrations run through `00006_sync_lessons_lock.sql` with no errors.

- [ ] **Step 11.3: Regenerate types**

Run:
```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Expected: `Functions` section in `src/types/database.ts` now contains `acquire_sync_lessons_lock` and `release_sync_lessons_lock`.

- [ ] **Step 11.4: Wrap sync calls with the advisory lock**

Add to `src/lib/lessons/sync.ts` — new exported function:

```typescript
export async function applyLessonSyncWithLock(
  admin: SupabaseClient,
  lessons: ParsedLesson[],
  options: SyncOptions,
): Promise<SyncSummary> {
  const { error: lockError } = await admin.rpc("acquire_sync_lessons_lock");
  if (lockError) {
    throw new Error(`Failed to acquire sync lock: ${lockError.message}`);
  }
  try {
    return await applyLessonSync(admin, lessons, options);
  } finally {
    const { error: unlockError } = await admin.rpc("release_sync_lessons_lock");
    if (unlockError) {
      console.error(`[sync-lessons] Failed to release lock: ${unlockError.message}`);
    }
  }
}
```

- [ ] **Step 11.5: Add a test for the lock wrapper (smoke test)**

Append to `src/lib/lessons/__tests__/sync.test.ts`:

```typescript
import { applyLessonSyncWithLock } from "../sync";

describe("applyLessonSyncWithLock", () => {
  it("runs under an advisory lock and returns a summary", async () => {
    const parsed = await walkLessons(TREE);
    const summary = await applyLessonSyncWithLock(admin, parsed, {
      allowOrphanedProgress: false,
    });
    expect(summary).toHaveProperty("inserted");
    expect(summary).toHaveProperty("updated");
    expect(summary).toHaveProperty("unchanged");
  });
});
```

- [ ] **Step 11.6: Run tests to verify they pass**

Run:
```bash
npx vitest run src/lib/lessons/__tests__/sync.test.ts
```

Expected: all tests PASS (4 existing + 1 new).

- [ ] **Step 11.7: Commit**

```bash
git add supabase/migrations/00006_sync_lessons_lock.sql src/types/database.ts src/lib/lessons/sync.ts src/lib/lessons/__tests__/sync.test.ts
git commit -m "add advisory lock RPC for sync-lessons concurrency safety"
```

---

## Task 12: `scripts/sync-lessons.ts` CLI entrypoint

**Goal:** A thin entrypoint runnable as `pnpm sync-lessons` (or `npm run sync-lessons`) that wires the walk + sync-with-lock together, prints a summary, and handles the `--allow-orphaned-progress` flag.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/scripts/sync-lessons.ts`

- [ ] **Step 12.1: Write the entrypoint**

Create `scripts/sync-lessons.ts`:

```typescript
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { walkLessons } from "../src/lib/lessons/walk";
import { applyLessonSyncWithLock } from "../src/lib/lessons/sync";

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "[sync-lessons] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
    );
    process.exit(1);
  }

  const allowOrphanedProgress = process.argv.includes("--allow-orphaned-progress");
  const rootDir = path.join(process.cwd(), "content", "lessons");

  console.info(`[sync-lessons] Walking ${rootDir}`);
  const lessons = await walkLessons(rootDir);
  console.info(`[sync-lessons] Found ${lessons.length} lesson(s)`);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const summary = await applyLessonSyncWithLock(admin, lessons, {
      allowOrphanedProgress,
    });
    console.info(
      `[sync-lessons] Done. inserted=${summary.inserted} updated=${summary.updated} unchanged=${summary.unchanged} soft_deleted=${summary.softDeleted}`
    );
    for (const w of summary.warnings) {
      console.warn(`[sync-lessons] WARNING: ${w}`);
    }
  } catch (err) {
    console.error(
      `[sync-lessons] Failed: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}

main();
```

- [ ] **Step 12.2: Verify the entrypoint runs on an empty content directory**

Create an empty directory:
```bash
mkdir -p content/lessons
```

Run:
```bash
npm run sync-lessons
```

Expected output:
```
[sync-lessons] Walking /Users/johnivanpuayap/hiraya/content/lessons
[sync-lessons] Found 0 lesson(s)
[sync-lessons] Done. inserted=0 updated=0 unchanged=0 soft_deleted=0
```

- [ ] **Step 12.3: Commit**

```bash
git add scripts/sync-lessons.ts content/lessons
git commit -m "add sync-lessons CLI entrypoint"
```

---

## Task 13: Authoring guide

**Goal:** A short README for admins explaining how to author new lessons and the rules the sync script enforces.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/content/lessons/README.md`

- [ ] **Step 13.1: Write the guide**

Create `content/lessons/README.md`:

```markdown
# Lesson Authoring Guide

Lessons live in this directory as Markdown files with YAML frontmatter. They
are admin-authored, committed to git, and synced into the Supabase `lessons`
table by `pnpm sync-lessons`.

## Directory layout

```
content/lessons/
  <category-slug>/
    01-<lesson-slug>.md
    02-<lesson-slug>.md
```

- `<category-slug>` must match a row's `name` in the `categories` table.
- The filename prefix (`01-`, `02-`, ...) controls display order.
- Slug (filename minus `.md`) is globally unique across categories.

## Frontmatter template

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
      Bubble sort makes a full pass for each of `n` elements in the worst
      case, yielding **O(n²)**. See the lesson body for the derivation.
---

# Lesson body in Markdown.
```

## Rules the sync enforces

- `title`, `category_slug`, `order`, `quiz` are required. `estimated_minutes` is optional.
- Each quiz question must have 2–6 options, exactly one marked `correct: true`, and a non-empty `explanation`.
- All content (prompts, options, explanations) may contain Markdown (code blocks, tables, inline formatting). Explanations render with the same Markdown pipeline as the lesson body.

## Adding a new lesson

1. Create the Markdown file under the correct category folder.
2. Run `npm run sync-lessons` to register it in the database.
3. The student-facing Learn section picks up the new lesson on next page load.

## Renaming or deleting a lesson

**Renaming the slug (filename)** is treated as delete + create. The sync script
refuses to proceed when it detects both a disappeared slug and a newly-appeared
slug in the same run. If you are certain you want to proceed — e.g., because
the old lesson is obsolete and the new one is genuinely different content —
re-run with:

```bash
npm run sync-lessons -- --allow-orphaned-progress
```

This soft-deletes the old slug (existing student progress rows stay attached to
the now-soft-deleted lesson). Progress rows are never automatically migrated
to the new slug.

**Deleting a lesson** is the same — remove the file and run `sync-lessons`. The
row is soft-deleted; student progress history is preserved.

**Moving a lesson to a different category** — change `category_slug` in the
frontmatter and keep the filename the same. The sync updates the
`category_id` without touching progress.

## Editing an existing lesson

- Edits to body or frontmatter that change any content produce a new
  `content_hash`. The in-memory loader cache invalidates automatically on the
  next read.
- Edits that affect only explanations leave `quiz_hash` unchanged, so
  students' in-progress quiz drafts survive the edit.
- Edits to prompts, options, or which option is `correct` change `quiz_hash`
  and will discard any in-progress drafts for that lesson.

## Troubleshooting

| Error | Fix |
|---|---|
| `Missing categories in DB: xyz` | Create the category in the `categories` table first (via existing admin tooling). |
| `Invalid frontmatter in <file>` | The YAML failed Zod validation. The message includes the exact path and missing/invalid fields. |
| `Possible rename detected. ... Refusing to proceed.` | Re-run with `--allow-orphaned-progress` if you truly want to proceed. |
```

- [ ] **Step 13.2: Commit**

```bash
git add content/lessons/README.md
git commit -m "add lesson authoring guide"
```

---

## Task 14: Pilot lesson + end-to-end verification

**Goal:** Seed one real lesson and run the sync end-to-end to prove the pipeline works against a real category.

**Files:**
- Create: `/Users/johnivanpuayap/hiraya/content/lessons/software-engineering/01-software-development-lifecycle.md`

- [ ] **Step 14.1: Check which category slug to use**

Run (requires local Supabase running):
```bash
npx supabase db dump --data-only --schema public --table categories 2>/dev/null | head -20
```

Or via SQL:
```bash
psql "$(npx supabase status -o json | node -e 'console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).DB_URL)')" -c "select name, display_name from public.categories order by name;"
```

Inspect the output and pick the slug for Software Engineering (likely `software-engineering` or `software_engineering`). Use that exact slug in the frontmatter below, replacing `<SE_SLUG>`.

If there is no Software Engineering category yet, insert one:

```bash
psql "$DB_URL" -c "insert into public.categories (name, display_name, exam_weight) values ('software-engineering', 'Software Engineering', 0.25) on conflict (name) do nothing;"
```

- [ ] **Step 14.2: Write the pilot lesson**

Create `content/lessons/<SE_SLUG>/01-software-development-lifecycle.md`, replacing `<SE_SLUG>` with the category slug chosen above:

```markdown
---
title: "Software Development Lifecycle"
category_slug: "<SE_SLUG>"
order: 1
estimated_minutes: 10
quiz:
  - prompt: "Which SDLC phase is primarily concerned with translating requirements into technical specifications?"
    options:
      - text: "Requirements gathering"
      - text: "Design"
        correct: true
      - text: "Implementation"
      - text: "Maintenance"
    explanation: |
      **Design** is where requirements are translated into architecture,
      interfaces, and data models. Requirements gathering precedes it;
      implementation follows it.

  - prompt: "In a Waterfall SDLC, what is the consequence of discovering a requirements defect during implementation?"
    options:
      - text: "Trivial — change the code and continue"
      - text: "Requires iterating back through design and possibly requirements"
        correct: true
      - text: "Defect is deferred to maintenance"
      - text: "Defect is ignored until the next release"
    explanation: |
      Waterfall is sequential — requirements feed design, which feeds
      implementation. A requirements defect found late typically forces the
      team to revisit design and requirements, which is why Waterfall is
      expensive under changing requirements.

  - prompt: "Which practice is MOST associated with Agile but not Waterfall?"
    options:
      - text: "Written requirements documents"
      - text: "Fixed-scope long-term plans"
      - text: "Iterative delivery with frequent stakeholder feedback"
        correct: true
      - text: "Detailed upfront design"
    explanation: |
      Agile emphasizes short iterations (typically 1–4 weeks) delivering
      working software, with stakeholder feedback gathered after every
      iteration. The other three options are hallmarks of plan-driven
      approaches like Waterfall.
---

# Software Development Lifecycle

The **Software Development Lifecycle (SDLC)** is the structured sequence of
phases a software project goes through, from idea to retirement.

## Core phases

1. **Requirements** — understand what the system must do.
2. **Design** — decide how it will do it (architecture, data model, interfaces).
3. **Implementation** — write the code.
4. **Testing** — verify it works.
5. **Deployment** — release to users.
6. **Maintenance** — fix bugs, add features, evolve.

Different process models organize these phases differently.

## Waterfall vs Agile

**Waterfall** runs the phases in order, once. Each phase has a gate:
requirements must be "done" before design starts, design must be "done" before
implementation starts, and so on. The strength is predictability; the weakness
is rigidity when requirements shift.

**Agile** runs all the phases in short iterations (sprints). Every sprint
produces working software. The strength is adaptability; the trade-off is
harder long-term planning.

## Why PhilNITS asks about this

PhilNITS Fundamental IT Engineer exam questions frequently test:

- Ordering of SDLC phases
- When a defect is cheapest to fix (earlier is exponentially cheaper)
- Differences between plan-driven and iterative models
- Matching a scenario to the right model

Focus on the **definitions** of each phase and the **trade-offs** between
Waterfall and Agile — those carry most of the exam weight.
```

- [ ] **Step 14.3: Run the sync**

Run:
```bash
npm run sync-lessons
```

Expected:
```
[sync-lessons] Walking .../content/lessons
[sync-lessons] Found 1 lesson(s)
[sync-lessons] Done. inserted=1 updated=0 unchanged=0 soft_deleted=0
```

- [ ] **Step 14.4: Verify the lesson row exists**

Run:
```bash
psql "$DB_URL" -c "select slug, title, order_index, deleted_at from public.lessons;"
```

Expected: one row with `slug = 'software-engineering/01-software-development-lifecycle'` (or matching your chosen `<SE_SLUG>`), `deleted_at` = null.

- [ ] **Step 14.5: Run the sync a second time to confirm idempotency**

Run:
```bash
npm run sync-lessons
```

Expected:
```
[sync-lessons] Done. inserted=0 updated=0 unchanged=1 soft_deleted=0
```

- [ ] **Step 14.6: Commit**

```bash
git add content/lessons/*/01-software-development-lifecycle.md
git commit -m "add first real lesson on software development lifecycle"
```

---

## Task 15: Bundle lesson content for serverless deployment

**Goal:** Ensure `content/lessons/**` is traced by Next.js's output-file-tracing so serverless deployments include the markdown files.

**Files:**
- Modify: `/Users/johnivanpuayap/hiraya/next.config.ts`

- [ ] **Step 15.1: Update next.config.ts**

Edit `next.config.ts` to this content:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      "/learn/**": ["./content/lessons/**/*.md"],
    },
  },
};

export default nextConfig;
```

- [ ] **Step 15.2: Verify the build still succeeds**

Run:
```bash
npm run build
```

Expected: build completes without errors. The `[/learn/**]` routes do not exist yet (they're Phase 3b), so tracing won't match anything — that is fine. The config is in place for when 3b adds routes.

- [ ] **Step 15.3: Commit**

```bash
git add next.config.ts
git commit -m "trace content/lessons markdown for serverless deployment"
```

---

## Task 16: Phase 3a final verification

**Goal:** Confirm every piece works together before handing off to Phase 3b.

- [ ] **Step 16.1: Run the full test suite**

Run:
```bash
npm test
```

Expected: all tests pass. Approximate count:
- schema: 11
- hash: 9
- parse: 3
- walk: 2
- cache: 4
- loader-public: 4
- loader-server-only: 2
- sync: 5

Total: ~40 tests passing.

- [ ] **Step 16.2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: exits 0 with no errors.

- [ ] **Step 16.3: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: no errors or warnings in new files.

- [ ] **Step 16.4: Verify production build**

Run:
```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 16.5: Push the branch**

Run:
```bash
git push -u origin feature/phase3-lessons
```

Expected: all commits from Phase 3a pushed to origin.

- [ ] **Step 16.6: Open a PR for Phase 3a**

Run:
```bash
gh pr create --base main --title "phase 3a: lessons schema, loader, sync" --body "$(cat <<'EOF'
## Summary
- Adds `lessons`, `lesson_reads`, `lesson_quiz_attempts` tables with RLS (service-role-only inserts for attempts).
- Adds filesystem-to-DB sync via `pnpm sync-lessons` with advisory lock, soft-delete, and rename detection.
- Adds two loaders: `loader-public.ts` (no answer key) and `loader-server-only.ts` (`import "server-only"`).
- Adds in-memory cache invalidated by DB `content_hash`.
- Seeds one real lesson on Software Development Lifecycle.
- No student-facing UI — that lands in Phase 3b.

## Test plan
- [ ] `npm test` passes (~40 tests)
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean
- [ ] `npm run build` clean
- [ ] `npm run sync-lessons` inserts the pilot lesson on a fresh DB
- [ ] Second sync reports `unchanged=1`
- [ ] Deleting the pilot file and re-running sync soft-deletes the row
- [ ] Re-creating the file and re-running sync reactivates it (`deleted_at = null`)
EOF
)"
```

Expected: PR created against `main`. Returns a URL.

---

## Phase 3a complete

Next: Phase 3b (reader + mark-as-read UI) gets its own plan via the writing-plans skill, against the same `feature/phase3-lessons` branch.
