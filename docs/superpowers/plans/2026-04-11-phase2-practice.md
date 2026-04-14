# Phase 2: Core Practice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the adaptive practice engine (IRT + spaced repetition + category targeting) and the quiz flow so students can actually practice PhilNITS questions.

**Architecture:** Server actions manage session lifecycle. The adaptive engine (pure TypeScript) runs server-side to select questions and update ability estimates. The quiz UI is a client component that calls server actions for each question. Study mode gives instant feedback; exam mode collects all answers before processing.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (service role for system writes), server actions

**Spec Reference:** `docs/superpowers/specs/2026-04-11-hiraya-mvp-design.md`
**Design Reference:** `docs/design.md`
**Coding Standards:** `docs/coding-standards.md`

---

## File Structure

```
src/
├── lib/
│   ├── adaptive/
│   │   ├── irt.ts                    — IRT probability, theta update, Fisher info question selection
│   │   ├── spaced-repetition.ts      — Modified SM-2 algorithm
│   │   └── engine.ts                 — Combined: overdue reviews → weak categories → IRT selection
│   └── supabase/
│       └── admin.ts                  — Service role client for system-level writes
├── app/
│   └── (student)/
│       └── practice/
│           ├── page.tsx              — Setup: choose mode, categories, question count
│           ├── loading.tsx           — Loading skeleton
│           ├── actions.ts            — Server actions: createSession, getNextQuestion, submitAnswer, completeSession
│           └── [sessionId]/
│               ├── page.tsx          — Active quiz interface (client component)
│               ├── error.tsx         — Quiz error boundary
│               └── results/
│                   └── page.tsx      — Score summary + answer review
├── components/
│   └── quiz/
│       ├── question-card.tsx         — Question text + 4 clickable option cards
│       ├── timer.tsx                 — Countdown timer (exam mode only)
│       ├── progress-bar.tsx          — "Question N of M" with visual bar
│       ├── answer-feedback.tsx       — Correct/wrong indicator (study mode only)
│       └── quiz-nav.tsx              — Next / quit / submit controls
└── supabase/
    └── seed-questions.sql            — Sample PhilNITS questions for testing
```

---

## Task 1: Service Role Client

**Files:**
- Create: `src/lib/supabase/admin.ts`

The adaptive engine needs to write to `student_ability`, `review_schedule`, and `streaks` — tables with no INSERT/UPDATE RLS policies for regular users. These writes use the Supabase service role key.

- [ ] **Step 1: Create the admin client**

Create `src/lib/supabase/admin.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. " +
      "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (never expose to client)."
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

- [ ] **Step 2: Add SUPABASE_SERVICE_ROLE_KEY to .env.local**

Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-from-supabase-dashboard>
```

Find this in Supabase Dashboard → Settings → API → `service_role` key (secret).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/admin.ts
git commit -m "add supabase service role client for system-level writes"
```

---

## Task 2: Seed Sample Questions

**Files:**
- Create: `supabase/seed-questions.sql`

We need real questions in the database to test the practice flow. These are sample PhilNITS FE-style questions.

- [ ] **Step 1: Create seed file with sample questions**

Create `supabase/seed-questions.sql`:

```sql
-- Sample PhilNITS FE questions for development and testing
-- Difficulty: 0.0 = average, negative = easier, positive = harder
-- Discrimination: 1.0 = default (Rasch model), higher = more discriminating

-- Technology
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'Which of the following best describes cloud computing?',
  'A local network of computers in an office',
  'On-demand delivery of IT resources over the internet with pay-as-you-go pricing',
  'A type of programming language used for web development',
  'A physical server stored in a company''s basement',
  'b',
  (SELECT id FROM public.categories WHERE name = 'technology'),
  '2023 April FE', -1.0, 1.0
),
(
  'What does IoT (Internet of Things) refer to?',
  'A new version of the internet protocol',
  'A social media platform for sharing ideas',
  'A network of physical devices embedded with sensors and software that connect and exchange data',
  'A programming framework for building mobile apps',
  'c',
  (SELECT id FROM public.categories WHERE name = 'technology'),
  '2023 October FE', -0.5, 1.0
),
(
  'Which technology is primarily used for decentralized, tamper-resistant record keeping?',
  'Virtual Reality',
  'Blockchain',
  'Augmented Reality',
  'Machine Learning',
  'b',
  (SELECT id FROM public.categories WHERE name = 'technology'),
  '2024 April FE', 0.5, 1.2
);

-- Management
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'In the PDCA cycle, what does the "C" stand for?',
  'Create',
  'Check',
  'Control',
  'Change',
  'b',
  (SELECT id FROM public.categories WHERE name = 'management'),
  '2023 April FE', -1.5, 1.0
),
(
  'Which of the following is a key principle of Total Quality Management (TQM)?',
  'Minimizing employee involvement',
  'Continuous improvement',
  'Reducing customer feedback channels',
  'Centralizing all decision-making',
  'b',
  (SELECT id FROM public.categories WHERE name = 'management'),
  '2023 October FE', 0.0, 1.0
),
(
  'What is the primary purpose of a Service Level Agreement (SLA)?',
  'To define the programming languages used in a project',
  'To set expectations for service delivery between a provider and customer',
  'To outline the physical layout of a data center',
  'To list all employees in the IT department',
  'b',
  (SELECT id FROM public.categories WHERE name = 'management'),
  '2024 April FE', 0.5, 1.1
);

-- Strategy
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What does a SWOT analysis evaluate?',
  'Software, Websites, Operations, Technology',
  'Strengths, Weaknesses, Opportunities, Threats',
  'Sales, Warranties, Output, Timelines',
  'Systems, Workflows, Objectives, Tasks',
  'b',
  (SELECT id FROM public.categories WHERE name = 'strategy'),
  '2023 April FE', -1.5, 1.0
),
(
  'Which IT strategy focuses on using technology to gain competitive advantage?',
  'Cost reduction strategy',
  'Strategic information systems planning',
  'Hardware maintenance planning',
  'Employee training schedule',
  'b',
  (SELECT id FROM public.categories WHERE name = 'strategy'),
  '2023 October FE', 0.5, 1.0
);

-- Hardware
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'Which component is responsible for performing arithmetic and logical operations in a computer?',
  'RAM',
  'Hard Drive',
  'ALU (Arithmetic Logic Unit)',
  'Power Supply',
  'c',
  (SELECT id FROM public.categories WHERE name = 'hardware'),
  '2023 April FE', -1.0, 1.0
),
(
  'What is the purpose of cache memory?',
  'To permanently store the operating system',
  'To provide high-speed data access to the processor by storing frequently used data',
  'To connect peripheral devices to the motherboard',
  'To convert analog signals to digital',
  'b',
  (SELECT id FROM public.categories WHERE name = 'hardware'),
  '2024 April FE', 0.0, 1.2
),
(
  'In the context of storage, what does RAID stand for?',
  'Random Access Internal Drive',
  'Redundant Array of Independent Disks',
  'Rapid Automated Information Delivery',
  'Remote Access to Internet Data',
  'b',
  (SELECT id FROM public.categories WHERE name = 'hardware'),
  '2024 April FE', 0.5, 1.0
);

-- Software
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What is the main purpose of an operating system?',
  'To browse the internet',
  'To manage hardware resources and provide services for application software',
  'To create documents and spreadsheets',
  'To protect against viruses',
  'b',
  (SELECT id FROM public.categories WHERE name = 'software'),
  '2023 April FE', -1.5, 1.0
),
(
  'Which of the following is an example of open-source software?',
  'Microsoft Office',
  'Adobe Photoshop',
  'Linux',
  'Windows 11',
  'c',
  (SELECT id FROM public.categories WHERE name = 'software'),
  '2023 October FE', -1.0, 1.0
),
(
  'What is the difference between a compiler and an interpreter?',
  'A compiler translates the entire source code at once, while an interpreter translates line by line',
  'A compiler is faster than an interpreter at runtime',
  'An interpreter produces an executable file, while a compiler does not',
  'There is no difference; they are the same',
  'a',
  (SELECT id FROM public.categories WHERE name = 'software'),
  '2024 April FE', 0.0, 1.1
);

-- Database
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What does SQL stand for?',
  'Simple Query Language',
  'Structured Query Language',
  'System Query Logic',
  'Standard Question Language',
  'b',
  (SELECT id FROM public.categories WHERE name = 'database'),
  '2023 April FE', -2.0, 1.0
),
(
  'Which normal form eliminates transitive dependencies?',
  'First Normal Form (1NF)',
  'Second Normal Form (2NF)',
  'Third Normal Form (3NF)',
  'Boyce-Codd Normal Form (BCNF)',
  'c',
  (SELECT id FROM public.categories WHERE name = 'database'),
  '2024 April FE', 1.0, 1.2
),
(
  'What is the purpose of an index in a database?',
  'To encrypt sensitive data',
  'To create a backup of the database',
  'To speed up data retrieval operations',
  'To enforce referential integrity',
  'c',
  (SELECT id FROM public.categories WHERE name = 'database'),
  '2023 October FE', -0.5, 1.0
);

-- Networking
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'Which protocol is used to send email?',
  'HTTP',
  'FTP',
  'SMTP',
  'DNS',
  'c',
  (SELECT id FROM public.categories WHERE name = 'networking'),
  '2023 April FE', -1.0, 1.0
),
(
  'What is the primary function of a router?',
  'To store web pages',
  'To forward data packets between computer networks',
  'To convert digital signals to analog',
  'To provide electricity to network devices',
  'b',
  (SELECT id FROM public.categories WHERE name = 'networking'),
  '2023 October FE', -0.5, 1.0
),
(
  'Which layer of the OSI model is responsible for end-to-end communication and error recovery?',
  'Network Layer',
  'Data Link Layer',
  'Transport Layer',
  'Application Layer',
  'd',
  (SELECT id FROM public.categories WHERE name = 'networking'),
  '2024 April FE', 1.0, 1.1
);

-- Security
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What is the primary goal of encryption?',
  'To speed up data transmission',
  'To compress data for storage',
  'To protect data confidentiality by making it unreadable without the correct key',
  'To create backup copies of data',
  'c',
  (SELECT id FROM public.categories WHERE name = 'security'),
  '2023 April FE', -1.0, 1.0
),
(
  'What type of attack involves intercepting communication between two parties without their knowledge?',
  'Phishing',
  'Man-in-the-middle attack',
  'Brute force attack',
  'SQL injection',
  'b',
  (SELECT id FROM public.categories WHERE name = 'security'),
  '2023 October FE', 0.0, 1.2
);

-- Algorithms & Data Structures
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What is the time complexity of binary search on a sorted array?',
  'O(n)',
  'O(n²)',
  'O(log n)',
  'O(1)',
  'c',
  (SELECT id FROM public.categories WHERE name = 'algorithms'),
  '2023 April FE', 0.0, 1.2
),
(
  'Which data structure follows the FIFO (First In, First Out) principle?',
  'Stack',
  'Queue',
  'Binary Tree',
  'Hash Table',
  'b',
  (SELECT id FROM public.categories WHERE name = 'algorithms'),
  '2023 October FE', -1.0, 1.0
),
(
  'What is the worst-case time complexity of quicksort?',
  'O(n log n)',
  'O(n)',
  'O(n²)',
  'O(log n)',
  'c',
  (SELECT id FROM public.categories WHERE name = 'algorithms'),
  '2024 April FE', 0.5, 1.1
);

-- System Development
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'Which software development model follows a sequential, linear approach?',
  'Agile',
  'Waterfall',
  'Scrum',
  'Extreme Programming',
  'b',
  (SELECT id FROM public.categories WHERE name = 'system-development'),
  '2023 April FE', -1.5, 1.0
),
(
  'What is the purpose of a use case diagram in UML?',
  'To show the physical deployment of software',
  'To describe interactions between users and the system',
  'To display the database schema',
  'To illustrate the class hierarchy',
  'b',
  (SELECT id FROM public.categories WHERE name = 'system-development'),
  '2024 April FE', 0.0, 1.0
);

-- Project Management
INSERT INTO public.questions (question_text, option_a, option_b, option_c, option_d, correct_answer, category_id, exam_source, difficulty, discrimination) VALUES
(
  'What is the critical path in project management?',
  'The path with the least number of tasks',
  'The longest sequence of dependent tasks that determines the minimum project duration',
  'The path that uses the most resources',
  'The first set of tasks to be completed',
  'b',
  (SELECT id FROM public.categories WHERE name = 'project-management'),
  '2023 April FE', 0.0, 1.0
),
(
  'In a Gantt chart, what do horizontal bars represent?',
  'Budget allocation',
  'Team member assignments',
  'Task duration and timeline',
  'Risk severity levels',
  'c',
  (SELECT id FROM public.categories WHERE name = 'project-management'),
  '2023 October FE', -0.5, 1.0
),
(
  'What does the term "scope creep" refer to in project management?',
  'A reduction in project budget',
  'The uncontrolled expansion of project scope without adjustments to time, cost, and resources',
  'A delay in project delivery',
  'A conflict between team members',
  'b',
  (SELECT id FROM public.categories WHERE name = 'project-management'),
  '2024 April FE', 0.0, 1.1
);
```

- [ ] **Step 2: Run seed in Supabase SQL editor**

Run the contents of `supabase/seed-questions.sql` in the Supabase SQL Editor. Verify with:
```sql
SELECT c.display_name, COUNT(q.id) AS question_count
FROM public.categories c
LEFT JOIN public.questions q ON q.category_id = c.id
GROUP BY c.display_name
ORDER BY c.display_name;
```

Expected: each category has 2-3 questions, ~30 total.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed-questions.sql
git commit -m "add sample PhilNITS questions for development testing"
```

---

## Task 3: IRT Engine

**Files:**
- Create: `src/lib/adaptive/irt.ts`

Pure functions for 2PL IRT model. No database dependencies — takes parameters and returns results.

- [ ] **Step 1: Create IRT module**

Create `src/lib/adaptive/irt.ts`:

```typescript
/**
 * 2-Parameter Logistic (2PL) Item Response Theory model.
 *
 * - theta: student ability per category, range [-4, 4]
 * - difficulty (b): question difficulty parameter
 * - discrimination (a): how sharply the question separates ability levels
 */

const THETA_MIN = -4.0;
const THETA_MAX = 4.0;

/** Probability of correct answer given ability and question parameters. */
export function probability(
  theta: number,
  difficulty: number,
  discrimination: number
): number {
  return 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
}

/**
 * Stepwise EAP theta update after a single answer.
 * Learning rate decays from 0.4 → 0.1 as questionsSeen increases.
 */
export function updateTheta(
  currentTheta: number,
  isCorrect: boolean,
  difficulty: number,
  discrimination: number,
  questionsSeen: number
): number {
  const pCorrect = probability(currentTheta, difficulty, discrimination);
  const learningRate = 0.1 + 0.3 / (1 + questionsSeen / 10);

  const delta = isCorrect
    ? learningRate * discrimination * (1 - pCorrect)
    : -learningRate * discrimination * pCorrect;

  return Math.max(THETA_MIN, Math.min(THETA_MAX, currentTheta + delta));
}

/** Fisher information — measures how much a question tells us about theta. */
export function fisherInformation(
  theta: number,
  difficulty: number,
  discrimination: number
): number {
  const p = probability(theta, difficulty, discrimination);
  return discrimination * discrimination * p * (1 - p);
}

export interface QuestionCandidate {
  id: string;
  difficulty: number;
  discrimination: number;
}

/** Select the question with maximum Fisher information for the student's theta. */
export function selectByMaxInfo(
  theta: number,
  candidates: QuestionCandidate[]
): QuestionCandidate | null {
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestInfo = fisherInformation(theta, best.difficulty, best.discrimination);

  for (let i = 1; i < candidates.length; i++) {
    const info = fisherInformation(
      theta,
      candidates[i].difficulty,
      candidates[i].discrimination
    );
    if (info > bestInfo) {
      best = candidates[i];
      bestInfo = info;
    }
  }

  return best;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/adaptive/irt.ts
git commit -m "add IRT engine: 2PL probability, theta estimation, Fisher info selection"
```

---

## Task 4: Spaced Repetition Engine

**Files:**
- Create: `src/lib/adaptive/spaced-repetition.ts`

Modified SM-2 algorithm. Binary mapping: wrong → quality 1, correct → quality 4.

- [ ] **Step 1: Create SM-2 module**

Create `src/lib/adaptive/spaced-repetition.ts`:

```typescript
/**
 * Modified SM-2 spaced repetition algorithm.
 * Binary-correct mapping: wrong → quality 1, correct → quality 4.
 */

export interface ReviewState {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
}

export interface ReviewUpdate extends ReviewState {
  nextReviewAt: Date;
}

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/** Compute new review schedule after an answer. */
export function computeReview(
  isCorrect: boolean,
  current: ReviewState | null
): ReviewUpdate {
  const prev: ReviewState = current ?? {
    intervalDays: 1.0,
    easeFactor: DEFAULT_EASE_FACTOR,
    repetitions: 0,
  };

  const quality = isCorrect ? 4 : 1;
  let intervalDays: number;
  let easeFactor: number;
  let repetitions: number;

  if (quality < 3) {
    // Wrong answer — reset
    repetitions = 0;
    intervalDays = 1.0;
    easeFactor = Math.max(MIN_EASE_FACTOR, prev.easeFactor - 0.2);
  } else {
    // Correct answer — advance
    repetitions = prev.repetitions + 1;
    if (repetitions === 1) {
      intervalDays = 1.0;
    } else if (repetitions === 2) {
      intervalDays = 6.0;
    } else {
      intervalDays = prev.intervalDays * prev.easeFactor;
    }
    easeFactor = Math.max(
      MIN_EASE_FACTOR,
      prev.easeFactor +
        (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  }

  const nextReviewAt = new Date();
  nextReviewAt.setTime(
    nextReviewAt.getTime() + intervalDays * 24 * 60 * 60 * 1000
  );

  return { intervalDays, easeFactor, repetitions, nextReviewAt };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/adaptive/spaced-repetition.ts
git commit -m "add spaced repetition engine: modified SM-2 algorithm"
```

---

## Task 5: Combined Adaptive Engine

**Files:**
- Create: `src/lib/adaptive/engine.ts`

Orchestrates IRT + spaced repetition + category targeting. This is the core question-selection and answer-processing logic.

- [ ] **Step 1: Create the combined engine**

Create `src/lib/adaptive/engine.ts`:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { selectByMaxInfo, updateTheta } from "./irt";
import { computeReview } from "./spaced-repetition";

type AdminClient = SupabaseClient<Database>;

// ─── Question Selection ───────────────────────────────────────

export interface SelectedQuestion {
  id: string;
  questionText: string;
  imageUrl: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  categoryId: string;
  difficulty: number;
  discrimination: number;
}

/**
 * Select the next question for a student in a session.
 * Priority: overdue reviews → weakest category → max Fisher info.
 */
export async function getNextQuestion(
  studentId: string,
  sessionId: string,
  categoryIds: string[] | null,
  admin: AdminClient
): Promise<SelectedQuestion | null> {
  // Get IDs of questions already answered in this session
  const { data: answered } = await admin
    .from("responses")
    .select("question_id")
    .eq("session_id", sessionId);

  const answeredIds = (answered ?? []).map((r) => r.question_id);

  // 1. Check for overdue reviews
  const overdueQuestion = await getOverdueReview(
    studentId,
    answeredIds,
    categoryIds,
    admin
  );
  if (overdueQuestion) return overdueQuestion;

  // 2. Find weakest category and select by IRT
  return getIRTQuestion(studentId, answeredIds, categoryIds, admin);
}

async function getOverdueReview(
  studentId: string,
  excludeIds: string[],
  categoryIds: string[] | null,
  admin: AdminClient
): Promise<SelectedQuestion | null> {
  let query = admin
    .from("review_schedule")
    .select("question_id")
    .eq("student_id", studentId)
    .lt("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(20);

  const { data: overdue } = await query;
  if (!overdue || overdue.length === 0) return null;

  // Filter out already-answered and wrong-category questions
  for (const row of overdue) {
    if (excludeIds.includes(row.question_id)) continue;

    const { data: question } = await admin
      .from("questions")
      .select("*")
      .eq("id", row.question_id)
      .single();

    if (!question) continue;
    if (categoryIds && !categoryIds.includes(question.category_id)) continue;

    return mapQuestion(question);
  }

  return null;
}

async function getIRTQuestion(
  studentId: string,
  excludeIds: string[],
  categoryIds: string[] | null,
  admin: AdminClient
): Promise<SelectedQuestion | null> {
  // Get student abilities across all categories
  const { data: abilities } = await admin
    .from("student_ability")
    .select("category_id, theta, questions_seen")
    .eq("student_id", studentId);

  const abilityMap = new Map(
    (abilities ?? []).map((a) => [a.category_id, a])
  );

  // Get available categories
  let catQuery = admin.from("categories").select("id");
  if (categoryIds && categoryIds.length > 0) {
    catQuery = catQuery.in("id", categoryIds);
  }
  const { data: categories } = await catQuery;
  if (!categories || categories.length === 0) return null;

  // Sort categories: unseen first, then by theta ascending (weakest first)
  const sorted = categories.sort((a, b) => {
    const abilA = abilityMap.get(a.id);
    const abilB = abilityMap.get(b.id);
    const seenA = abilA?.questions_seen ?? 0;
    const seenB = abilB?.questions_seen ?? 0;

    // Unseen categories first
    if (seenA === 0 && seenB !== 0) return -1;
    if (seenB === 0 && seenA !== 0) return 1;

    // Then by theta ascending (weakest first)
    const thetaA = abilA?.theta ?? 0;
    const thetaB = abilB?.theta ?? 0;
    return thetaA - thetaB;
  });

  // Try each category until we find a question
  for (const cat of sorted) {
    const ability = abilityMap.get(cat.id);
    const theta = ability?.theta ?? 0;

    // Get candidate questions from this category
    let qQuery = admin
      .from("questions")
      .select("id, difficulty, discrimination, question_text, image_url, option_a, option_b, option_c, option_d, category_id")
      .eq("category_id", cat.id);

    const { data: questions } = await qQuery;
    if (!questions || questions.length === 0) continue;

    // Exclude already-answered questions
    const candidates = questions.filter((q) => !excludeIds.includes(q.id));
    if (candidates.length === 0) continue;

    // Select by maximum Fisher information
    const selected = selectByMaxInfo(
      theta,
      candidates.map((q) => ({
        id: q.id,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
      }))
    );

    if (!selected) continue;

    const full = candidates.find((q) => q.id === selected.id);
    if (!full) continue;

    return mapQuestion(full);
  }

  return null;
}

function mapQuestion(q: {
  id: string;
  question_text: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  category_id: string;
  difficulty: number;
  discrimination: number;
}): SelectedQuestion {
  return {
    id: q.id,
    questionText: q.question_text,
    imageUrl: q.image_url,
    optionA: q.option_a,
    optionB: q.option_b,
    optionC: q.option_c,
    optionD: q.option_d,
    categoryId: q.category_id,
    difficulty: q.difficulty,
    discrimination: q.discrimination,
  };
}

// ─── Answer Processing ────────────────────────────────────────

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  newTheta: number;
}

/**
 * Process a student's answer: update IRT theta and spaced repetition schedule.
 * Called immediately in study mode, batch-called in exam mode on completion.
 */
export async function processAnswer(
  studentId: string,
  questionId: string,
  isCorrect: boolean,
  admin: AdminClient
): Promise<AnswerResult> {
  // Get question details
  const { data: question } = await admin
    .from("questions")
    .select("category_id, difficulty, discrimination, correct_answer")
    .eq("id", questionId)
    .single();

  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }

  // Get or create student ability for this category
  const { data: ability } = await admin
    .from("student_ability")
    .select("*")
    .eq("student_id", studentId)
    .eq("category_id", question.category_id)
    .single();

  const currentTheta = ability?.theta ?? 0;
  const questionsSeen = ability?.questions_seen ?? 0;
  const correctCount = ability?.correct_count ?? 0;

  // Update theta via IRT
  const newTheta = updateTheta(
    currentTheta,
    isCorrect,
    question.difficulty,
    question.discrimination,
    questionsSeen
  );

  // Upsert student_ability
  await admin.from("student_ability").upsert(
    {
      student_id: studentId,
      category_id: question.category_id,
      theta: newTheta,
      questions_seen: questionsSeen + 1,
      correct_count: correctCount + (isCorrect ? 1 : 0),
    },
    { onConflict: "student_id,category_id" }
  );

  console.info("[adaptive] theta updated", {
    studentId,
    category: question.category_id,
    oldTheta: currentTheta,
    newTheta,
    isCorrect,
  });

  // Update spaced repetition schedule
  const { data: existingReview } = await admin
    .from("review_schedule")
    .select("interval_days, ease_factor, repetitions")
    .eq("student_id", studentId)
    .eq("question_id", questionId)
    .single();

  const reviewState = existingReview
    ? {
        intervalDays: existingReview.interval_days,
        easeFactor: existingReview.ease_factor,
        repetitions: existingReview.repetitions,
      }
    : null;

  const review = computeReview(isCorrect, reviewState);

  await admin.from("review_schedule").upsert(
    {
      student_id: studentId,
      question_id: questionId,
      next_review_at: review.nextReviewAt.toISOString(),
      interval_days: review.intervalDays,
      ease_factor: review.easeFactor,
      repetitions: review.repetitions,
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: "student_id,question_id" }
  );

  return {
    isCorrect,
    correctAnswer: question.correct_answer,
    newTheta,
  };
}

// ─── Streak Update ────────────────────────────────────────────

/** Update streak when a student completes a session. Uses Philippine time (UTC+8). */
export async function updateStreak(
  studentId: string,
  admin: AdminClient
): Promise<void> {
  // Get current date in Philippine Standard Time (UTC+8)
  const now = new Date();
  const phtOffset = 8 * 60 * 60 * 1000;
  const phtDate = new Date(now.getTime() + phtOffset);
  const today = phtDate.toISOString().split("T")[0]; // YYYY-MM-DD

  const yesterday = new Date(phtDate.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: streak } = await admin
    .from("streaks")
    .select("*")
    .eq("student_id", studentId)
    .single();

  if (!streak) {
    // First ever session — create streak
    await admin.from("streaks").insert({
      student_id: studentId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
    });
    return;
  }

  if (streak.last_active_date === today) {
    // Already active today — no change
    return;
  }

  const newCurrent =
    streak.last_active_date === yesterday
      ? streak.current_streak + 1 // Consecutive day
      : 1; // Streak broken

  const newLongest = Math.max(streak.longest_streak, newCurrent);

  await admin
    .from("streaks")
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_active_date: today,
    })
    .eq("student_id", studentId);

  console.info("[adaptive] streak updated", {
    studentId,
    currentStreak: newCurrent,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/adaptive/engine.ts
git commit -m "add combined adaptive engine: IRT + SR + category targeting + streaks"
```

---

## Task 6: Practice Server Actions

**Files:**
- Create: `src/app/(student)/practice/actions.ts`

Server actions that orchestrate the practice flow. These are called by the quiz UI.

- [ ] **Step 1: Create practice server actions**

Create `src/app/(student)/practice/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getNextQuestion as engineGetNext,
  processAnswer,
  updateStreak,
} from "@/lib/adaptive/engine";

import type { SelectedQuestion } from "@/lib/adaptive/engine";

// ─── Types ────────────────────────────────────────────────────

interface CreateSessionInput {
  mode: "study" | "exam";
  categoryIds: string[];
  questionCount: number;
  timeLimitMinutes: number | null;
}

interface QuestionResponse {
  question: SelectedQuestion;
  questionNumber: number;
  totalQuestions: number;
}

interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  selectedAnswer: "a" | "b" | "c" | "d";
  timeSpentMs: number;
}

interface StudyFeedback {
  isCorrect: boolean;
  correctAnswer: string;
}

interface SessionResults {
  correctCount: number;
  totalAnswered: number;
  score: number;
}

// ─── Actions ──────────────────────────────────────────────────

export async function createSession(
  input: CreateSessionInput
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      student_id: user.id,
      mode: input.mode,
      category_ids: input.categoryIds.length > 0 ? input.categoryIds : null,
      question_count: input.questionCount,
      time_limit_minutes: input.timeLimitMinutes,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[practice] failed to create session", error);
    throw new Error("Failed to create practice session");
  }

  console.info("[practice] session created", {
    sessionId: data.id,
    mode: input.mode,
    questionCount: input.questionCount,
  });

  return data.id;
}

export async function fetchNextQuestion(
  sessionId: string
): Promise<QuestionResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Get session details
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id, category_ids, question_count")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== user.id) {
    throw new Error("Session not found");
  }

  // Check how many questions already answered
  const { count } = await admin
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const answered = count ?? 0;

  if (answered >= session.question_count) {
    return null; // Session complete
  }

  const question = await engineGetNext(
    user.id,
    sessionId,
    session.category_ids,
    admin
  );

  if (!question) {
    return null; // No more questions available
  }

  return {
    question,
    questionNumber: answered + 1,
    totalQuestions: session.question_count,
  };
}

export async function submitAnswer(
  input: SubmitAnswerInput
): Promise<StudyFeedback | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Get session to check mode and ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id, mode")
    .eq("id", input.sessionId)
    .single();

  if (!session || session.student_id !== user.id) {
    throw new Error("Session not found");
  }

  // Get question to check correctness
  const { data: question } = await admin
    .from("questions")
    .select("correct_answer")
    .eq("id", input.questionId)
    .single();

  if (!question) {
    throw new Error("Question not found");
  }

  const isCorrect = input.selectedAnswer === question.correct_answer;

  // Record the response (student has INSERT permission via RLS)
  const { error } = await supabase.from("responses").insert({
    session_id: input.sessionId,
    question_id: input.questionId,
    selected_answer: input.selectedAnswer,
    is_correct: isCorrect,
    time_spent_ms: input.timeSpentMs,
  });

  if (error) {
    console.error("[practice] failed to record response", error);
    throw new Error("Failed to record answer");
  }

  // Update session correct_count
  if (isCorrect) {
    const { data: currentSession } = await supabase
      .from("sessions")
      .select("correct_count")
      .eq("id", input.sessionId)
      .single();

    await supabase
      .from("sessions")
      .update({ correct_count: (currentSession?.correct_count ?? 0) + 1 })
      .eq("id", input.sessionId);
  }

  // Study mode: process IRT + SR immediately and return feedback
  if (session.mode === "study") {
    const result = await processAnswer(user.id, input.questionId, isCorrect, admin);
    return {
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
    };
  }

  // Exam mode: no feedback, IRT + SR processed on session completion
  return null;
}

export async function completeSession(
  sessionId: string
): Promise<SessionResults> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Get session
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id, mode, correct_count")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== user.id) {
    throw new Error("Session not found");
  }

  // Count total responses
  const { count } = await admin
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const totalAnswered = count ?? 0;

  // Exam mode: process IRT + SR for all responses
  if (session.mode === "exam") {
    const { data: responses } = await admin
      .from("responses")
      .select("question_id, is_correct")
      .eq("session_id", sessionId);

    for (const response of responses ?? []) {
      await processAnswer(
        user.id,
        response.question_id,
        response.is_correct,
        admin
      );
    }
  }

  // Mark session complete
  await supabase
    .from("sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  // Update streak
  await updateStreak(user.id, admin);

  console.info("[practice] session completed", {
    sessionId,
    correctCount: session.correct_count,
    totalAnswered,
  });

  return {
    correctCount: session.correct_count,
    totalAnswered,
    score: totalAnswered > 0 ? session.correct_count / totalAnswered : 0,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(student\)/practice/actions.ts
git commit -m "add practice server actions: session lifecycle and answer processing"
```

---

## Task 7: Quiz UI Components

**Files:**
- Create: `src/components/quiz/question-card.tsx`
- Create: `src/components/quiz/timer.tsx`
- Create: `src/components/quiz/progress-bar.tsx`
- Create: `src/components/quiz/answer-feedback.tsx`
- Create: `src/components/quiz/quiz-nav.tsx`

- [ ] **Step 1: Create QuestionCard**

Create `src/components/quiz/question-card.tsx`:

```typescript
"use client";

interface QuestionCardProps {
  questionText: string;
  imageUrl: string | null;
  options: { key: "a" | "b" | "c" | "d"; text: string }[];
  selectedAnswer: "a" | "b" | "c" | "d" | null;
  correctAnswer?: string | null;
  showFeedback: boolean;
  disabled: boolean;
  onSelect: (answer: "a" | "b" | "c" | "d") => void;
}

const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D" } as const;

export function QuestionCard({
  questionText,
  imageUrl,
  options,
  selectedAnswer,
  correctAnswer,
  showFeedback,
  disabled,
  onSelect,
}: QuestionCardProps) {
  function getOptionStyle(key: "a" | "b" | "c" | "d"): string {
    const base =
      "flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors";

    if (showFeedback && correctAnswer) {
      if (key === correctAnswer) {
        return `${base} border-success bg-success/10 text-text-primary`;
      }
      if (key === selectedAnswer && key !== correctAnswer) {
        return `${base} border-danger bg-danger/10 text-text-primary`;
      }
      return `${base} border-surface bg-white text-text-secondary`;
    }

    if (key === selectedAnswer) {
      return `${base} border-accent bg-accent/10 text-text-primary`;
    }

    return `${base} border-surface bg-white text-text-primary hover:border-accent/30`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-lg font-medium leading-relaxed text-text-primary">
          {questionText}
        </p>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Question illustration"
            className="mt-4 max-h-64 rounded-xl"
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.key)}
            className={getOptionStyle(option.key)}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface font-heading text-xs font-bold text-text-secondary">
              {OPTION_LABELS[option.key]}
            </span>
            <span>{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Timer**

Create `src/components/quiz/timer.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
}

export function Timer({ totalSeconds, onTimeUp }: TimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  const handleTimeUp = useCallback(onTimeUp, [onTimeUp]);

  useEffect(() => {
    if (remaining <= 0) {
      handleTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining, handleTimeUp]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = remaining / totalSeconds;

  const urgencyColor =
    progress > 0.25
      ? "bg-accent"
      : progress > 0.1
        ? "bg-secondary"
        : "bg-danger";

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgencyColor}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className="min-w-[4rem] text-right font-heading text-sm font-bold text-text-primary">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Create ProgressBar**

Create `src/components/quiz/progress-bar.tsx`:

```typescript
interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const progress = total > 0 ? ((current - 1) / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-sm font-medium text-text-secondary">
        {current} of {total}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create AnswerFeedback**

Create `src/components/quiz/answer-feedback.tsx`:

```typescript
interface AnswerFeedbackProps {
  isCorrect: boolean;
}

export function AnswerFeedback({ isCorrect }: AnswerFeedbackProps) {
  return (
    <div
      className={`rounded-xl border-2 px-4 py-3 text-sm font-medium ${
        isCorrect
          ? "border-success/30 bg-success/10 text-success"
          : "border-danger/30 bg-danger/10 text-danger"
      }`}
    >
      {isCorrect ? "Correct! Well done." : "Incorrect. Review this topic."}
    </div>
  );
}
```

- [ ] **Step 5: Create QuizNav**

Create `src/components/quiz/quiz-nav.tsx`:

```typescript
import { Button } from "@/components/ui/button";

interface QuizNavProps {
  mode: "study" | "exam";
  hasAnswered: boolean;
  showingFeedback: boolean;
  isLastQuestion: boolean;
  onNext: () => void;
  onQuit: () => void;
  onSubmitExam: () => void;
}

export function QuizNav({
  mode,
  hasAnswered,
  showingFeedback,
  isLastQuestion,
  onNext,
  onQuit,
  onSubmitExam,
}: QuizNavProps) {
  if (mode === "study") {
    return (
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onQuit}>
          Quit
        </Button>
        {showingFeedback && (
          <Button onClick={onNext}>
            {isLastQuestion ? "Finish" : "Next Question"}
          </Button>
        )}
      </div>
    );
  }

  // Exam mode
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" onClick={onQuit}>
        Quit Exam
      </Button>
      {isLastQuestion && hasAnswered ? (
        <Button onClick={onSubmitExam}>Submit Exam</Button>
      ) : (
        <Button onClick={onNext} disabled={!hasAnswered}>
          Next Question
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/quiz/
git commit -m "add quiz UI components: question card, timer, progress bar, feedback, navigation"
```

---

## Task 8: Practice Setup Page

**Files:**
- Create: `src/app/(student)/practice/page.tsx`
- Create: `src/app/(student)/practice/loading.tsx`

The setup page where students choose mode, categories, and question count before starting.

- [ ] **Step 1: Create the setup page**

Create `src/app/(student)/practice/page.tsx`:

```typescript
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserRoleWithFallback } from "@/lib/auth";
import { PracticeSetup } from "./practice-setup";

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "student") redirect("/dashboard");

  // Fetch categories for the selection form
  const { data: categories } = await supabase
    .from("categories")
    .select("id, display_name")
    .order("display_name");

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Practice
      </h2>
      <p className="mt-1 text-text-secondary">
        Choose your mode and topics, then start practicing.
      </p>

      <div className="mt-6">
        <PracticeSetup categories={categories ?? []} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the client setup form**

Create `src/app/(student)/practice/practice-setup.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSession } from "./actions";

interface Category {
  id: string;
  display_name: string;
}

interface PracticeSetupProps {
  categories: Category[];
}

const QUESTION_COUNTS = [10, 20, 30] as const;
const TIME_PRESETS = [
  { label: "25 min", value: 25 },
  { label: "50 min", value: 50 },
  { label: "75 min", value: 75 },
] as const;

export function PracticeSetup({ categories }: PracticeSetupProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleStart() {
    setLoading(true);
    try {
      const sessionId = await createSession({
        mode,
        categoryIds: selectedCategories,
        questionCount,
        timeLimitMinutes: mode === "exam" ? timeLimitMinutes : null,
      });
      router.push(`/practice/${sessionId}`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mode selection */}
      <Card>
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Mode
        </h3>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => setMode("study")}
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === "study"
                ? "border-accent bg-accent/10 text-accent"
                : "border-surface text-text-secondary hover:border-accent/30"
            }`}
          >
            <span className="block font-heading text-base font-bold">Study</span>
            <span className="mt-0.5 block text-xs">
              Untimed, instant feedback
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("exam");
              if (!timeLimitMinutes) setTimeLimitMinutes(25);
            }}
            className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === "exam"
                ? "border-accent bg-accent/10 text-accent"
                : "border-surface text-text-secondary hover:border-accent/30"
            }`}
          >
            <span className="block font-heading text-base font-bold">Exam</span>
            <span className="mt-0.5 block text-xs">
              Timed, no feedback until done
            </span>
          </button>
        </div>
      </Card>

      {/* Category selection */}
      <Card>
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Topics
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          Select specific topics or leave empty to practice all.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              className={`rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedCategories.includes(cat.id)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-surface text-text-secondary hover:border-accent/30"
              }`}
            >
              {cat.display_name}
            </button>
          ))}
        </div>
      </Card>

      {/* Question count */}
      <Card>
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Questions
        </h3>
        <div className="mt-3 flex gap-3">
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setQuestionCount(count)}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-center font-heading text-lg font-bold transition-colors ${
                questionCount === count
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-surface text-text-secondary hover:border-accent/30"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </Card>

      {/* Time limit (exam mode only) */}
      {mode === "exam" && (
        <Card>
          <h3 className="font-heading text-lg font-bold text-text-primary">
            Time Limit
          </h3>
          <div className="mt-3 flex gap-3">
            {TIME_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setTimeLimitMinutes(preset.value)}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-center text-sm font-medium transition-colors ${
                  timeLimitMinutes === preset.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-surface text-text-secondary hover:border-accent/30"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Start button */}
      <Button onClick={handleStart} disabled={loading} size="lg">
        {loading ? "Starting..." : "Start Practice"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `src/app/(student)/practice/loading.tsx`:

```typescript
export default function PracticeLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 rounded-xl bg-surface" />
      <div className="mt-2 h-4 w-64 rounded-xl bg-surface" />
      <div className="mt-6 flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(student\)/practice/page.tsx src/app/\(student\)/practice/practice-setup.tsx src/app/\(student\)/practice/loading.tsx
git commit -m "add practice setup page: mode, category, and question count selection"
```

---

## Task 9: Active Quiz Page

**Files:**
- Create: `src/app/(student)/practice/[sessionId]/page.tsx`
- Create: `src/app/(student)/practice/[sessionId]/error.tsx`

The main quiz interface. A client component that manages quiz state and calls server actions.

- [ ] **Step 1: Create the quiz page**

Create `src/app/(student)/practice/[sessionId]/page.tsx`:

```typescript
"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { QuestionCard } from "@/components/quiz/question-card";
import { Timer } from "@/components/quiz/timer";
import { ProgressBar } from "@/components/quiz/progress-bar";
import { AnswerFeedback } from "@/components/quiz/answer-feedback";
import { QuizNav } from "@/components/quiz/quiz-nav";
import { fetchNextQuestion, submitAnswer, completeSession } from "../actions";

import type { SelectedQuestion } from "@/lib/adaptive/engine";

type Answer = "a" | "b" | "c" | "d";

interface SessionPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [question, setQuestion] = useState<SelectedQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null);

  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [answerStartTime, setAnswerStartTime] = useState(Date.now());

  // Load session info and first question
  useEffect(() => {
    loadSessionAndQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSessionAndQuestion() {
    setLoadingQuestion(true);
    try {
      const result = await fetchNextQuestion(sessionId);
      if (!result) {
        // Session is already complete or no questions
        router.replace(`/practice/${sessionId}/results`);
        return;
      }

      setQuestion(result.question);
      setQuestionNumber(result.questionNumber);
      setTotalQuestions(result.totalQuestions);
      setAnswerStartTime(Date.now());

      // Detect mode and time limit from first load
      // We determine mode from the URL or session — for now we pass it via searchParams
      // but actually we should fetch session info. Let's fetch it:
      const response = await fetch(`/api/session/${sessionId}/info`);
      if (response.ok) {
        const info = await response.json();
        setMode(info.mode);
        if (info.timeLimitMinutes) {
          setTimeLimitSeconds(info.timeLimitMinutes * 60);
        }
      }
    } finally {
      setLoadingQuestion(false);
    }
  }

  const handleTimeUp = useCallback(async () => {
    await completeSession(sessionId);
    router.replace(`/practice/${sessionId}/results`);
  }, [sessionId, router]);

  async function handleSelectAnswer(answer: Answer) {
    if (submitting || feedback) return;

    setSelectedAnswer(answer);

    if (mode === "study") {
      // Study mode: submit immediately, show feedback
      setSubmitting(true);
      const timeSpentMs = Date.now() - answerStartTime;

      const result = await submitAnswer({
        sessionId,
        questionId: question!.id,
        selectedAnswer: answer,
        timeSpentMs,
      });

      setFeedback(result);
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (mode === "exam" && selectedAnswer && question) {
      // Exam mode: submit answer before moving to next
      setSubmitting(true);
      const timeSpentMs = Date.now() - answerStartTime;

      await submitAnswer({
        sessionId,
        questionId: question.id,
        selectedAnswer,
        timeSpentMs,
      });
      setSubmitting(false);
    }

    // Reset and load next question
    setSelectedAnswer(null);
    setFeedback(null);
    setLoadingQuestion(true);

    const result = await fetchNextQuestion(sessionId);
    if (!result) {
      // No more questions
      if (mode === "exam") {
        await completeSession(sessionId);
      } else {
        await completeSession(sessionId);
      }
      router.replace(`/practice/${sessionId}/results`);
      return;
    }

    setQuestion(result.question);
    setQuestionNumber(result.questionNumber);
    setTotalQuestions(result.totalQuestions);
    setAnswerStartTime(Date.now());
    setLoadingQuestion(false);
  }

  async function handleQuit() {
    await completeSession(sessionId);
    router.replace(`/practice/${sessionId}/results`);
  }

  async function handleSubmitExam() {
    // Submit the current answer if selected
    if (selectedAnswer && question) {
      const timeSpentMs = Date.now() - answerStartTime;
      await submitAnswer({
        sessionId,
        questionId: question.id,
        selectedAnswer,
        timeSpentMs,
      });
    }
    await completeSession(sessionId);
    router.replace(`/practice/${sessionId}/results`);
  }

  if (loadingQuestion && !question) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <p className="text-text-secondary">Loading question...</p>
        </div>
      </Card>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* Timer (exam mode only) */}
      {mode === "exam" && timeLimitSeconds && (
        <Timer totalSeconds={timeLimitSeconds} onTimeUp={handleTimeUp} />
      )}

      {/* Progress */}
      <ProgressBar current={questionNumber} total={totalQuestions} />

      {/* Question */}
      <Card padding="lg">
        <QuestionCard
          questionText={question.questionText}
          imageUrl={question.imageUrl}
          options={[
            { key: "a", text: question.optionA },
            { key: "b", text: question.optionB },
            { key: "c", text: question.optionC },
            { key: "d", text: question.optionD },
          ]}
          selectedAnswer={selectedAnswer}
          correctAnswer={feedback?.correctAnswer ?? null}
          showFeedback={!!feedback}
          disabled={submitting || !!feedback}
          onSelect={handleSelectAnswer}
        />

        {/* Feedback (study mode) */}
        {feedback && (
          <div className="mt-4">
            <AnswerFeedback isCorrect={feedback.isCorrect} />
          </div>
        )}
      </Card>

      {/* Navigation */}
      <QuizNav
        mode={mode}
        hasAnswered={!!selectedAnswer}
        showingFeedback={!!feedback}
        isLastQuestion={questionNumber >= totalQuestions}
        onNext={handleNext}
        onQuit={handleQuit}
        onSubmitExam={handleSubmitExam}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create session info API route**

Create `src/app/api/session/[sessionId]/info/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("mode, time_limit_minutes")
    .eq("id", sessionId)
    .eq("student_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    mode: session.mode,
    timeLimitMinutes: session.time_limit_minutes,
  });
}
```

- [ ] **Step 3: Create error boundary**

Create `src/app/(student)/practice/[sessionId]/error.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function QuizError({ error, reset }: ErrorProps) {
  return (
    <div className="mx-auto max-w-md py-12">
      <Card>
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

- [ ] **Step 4: Commit**

```bash
git add src/app/\(student\)/practice/\[sessionId\]/ src/app/api/session/
git commit -m "add active quiz page with adaptive question flow"
```

---

## Task 10: Results Page

**Files:**
- Create: `src/app/(student)/practice/[sessionId]/results/page.tsx`

Displays score summary and answer review after session completion.

- [ ] **Step 1: Create results page**

Create `src/app/(student)/practice/[sessionId]/results/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get session info
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id, mode, question_count, correct_count, completed_at, started_at")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== user.id) {
    redirect("/practice");
  }

  // Get responses with question details
  const admin = createAdminClient();
  const { data: responses } = await admin
    .from("responses")
    .select("question_id, selected_answer, is_correct, time_spent_ms")
    .eq("session_id", sessionId)
    .order("answered_at", { ascending: true });

  // Get question details for each response
  const questionIds = (responses ?? []).map((r) => r.question_id);
  const { data: questions } = await admin
    .from("questions")
    .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, category_id")
    .in("id", questionIds.length > 0 ? questionIds : ["__none__"]);

  // Get category names
  const categoryIds = [...new Set((questions ?? []).map((q) => q.category_id))];
  const { data: categories } = await admin
    .from("categories")
    .select("id, display_name")
    .in("id", categoryIds.length > 0 ? categoryIds : ["__none__"]);

  const questionMap = new Map((questions ?? []).map((q) => [q.id, q]));
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));

  const totalAnswered = responses?.length ?? 0;
  const correctCount = session.correct_count;
  const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const OPTION_LABELS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };
  function getOptionText(q: NonNullable<typeof questions>[number], key: string): string {
    const map: Record<string, string> = {
      a: q.option_a,
      b: q.option_b,
      c: q.option_c,
      d: q.option_d,
    };
    return map[key] ?? "";
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Results
      </h2>
      <p className="mt-1 text-text-secondary">
        {session.mode === "study" ? "Study" : "Exam"} session complete
      </p>

      {/* Score summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-text-secondary">Score</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            {score}%
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Correct</p>
          <p className="mt-1 font-heading text-3xl font-bold text-success">
            {correctCount}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Total</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            {totalAnswered}
          </p>
        </Card>
      </div>

      {/* Answer review */}
      <div className="mt-8 flex flex-col gap-4">
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Answer Review
        </h3>

        {(responses ?? []).map((response, index) => {
          const q = questionMap.get(response.question_id);
          if (!q) return null;

          const category = categoryMap.get(q.category_id);

          return (
            <Card key={response.question_id} padding="sm">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    response.is_correct ? "bg-success" : "bg-danger"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {q.question_text}
                  </p>
                  {category && (
                    <span className="mt-1 inline-block rounded-lg bg-surface px-2 py-0.5 text-xs text-text-secondary">
                      {category.display_name}
                    </span>
                  )}
                  <div className="mt-2 flex gap-4 text-xs">
                    <span className={response.is_correct ? "text-success" : "text-danger"}>
                      Your answer: {OPTION_LABELS[response.selected_answer ?? ""]}{" "}
                      — {response.selected_answer ? getOptionText(q, response.selected_answer) : "Skipped"}
                    </span>
                    {!response.is_correct && (
                      <span className="text-success">
                        Correct: {OPTION_LABELS[q.correct_answer]} — {getOptionText(q, q.correct_answer)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-3">
        <Link href="/practice">
          <Button>Practice Again</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(student\)/practice/\[sessionId\]/results/
git commit -m "add results page: score summary and answer review"
```

---

## Summary

Phase 2 delivers:
- **Adaptive engine:** IRT 2PL model with stepwise EAP estimation, Fisher information question selection
- **Spaced repetition:** Modified SM-2 algorithm with binary-correct mapping
- **Combined selection:** Overdue reviews → weakest categories → max Fisher info
- **Practice flow:** Setup page → active quiz → results page
- **Two modes:** Study (instant feedback, adaptive per-question) and Exam (timed, batch processing)
- **Streak tracking:** Philippine timezone-aware daily streaks
- **30 sample questions** across all 11 PhilNITS categories
- **Quiz components:** QuestionCard, Timer, ProgressBar, AnswerFeedback, QuizNav

**Next phase:** Phase 3 (Student Dashboard & Features) builds real analytics on top of the data generated by practice sessions.
