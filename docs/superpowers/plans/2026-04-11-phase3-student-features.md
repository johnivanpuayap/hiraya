# Phase 3: Student Dashboard & Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder student dashboard with real analytics (mastery, readiness, streaks, trends, weak topics) and build the remaining student pages (assignments, class join, profile).

**Architecture:** Dashboard components are Server Components that query Supabase directly. Charts use lightweight SVG-based rendering (no chart library). The readiness score formula uses IRT theta + category exam weights.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase, SVG charts

**Spec Reference:** `docs/superpowers/specs/2026-04-11-hiraya-mvp-design.md`

---

## File Structure

```
src/
├── components/
│   └── dashboard/
│       ├── stat-card.tsx             — Single metric card with icon
│       ├── mastery-chart.tsx         — Horizontal bars: mastery % per category
│       ├── readiness-gauge.tsx       — Circular gauge: 0-100% exam readiness
│       ├── streak-display.tsx        — Flame icon + streak count
│       ├── weak-topics.tsx           — Ranked list with "Practice Now" links
│       └── trend-graph.tsx           — Line chart of recent session scores
├── app/
│   ├── dashboard/
│   │   └── page.tsx                  — Updated: real data for student + teacher
│   └── (student)/
│       ├── assignments/
│       │   ├── page.tsx              — List teacher-assigned work
│       │   └── loading.tsx
│       ├── classes/
│       │   └── join/
│       │       ├── page.tsx          — Enter join code
│       │       ├── actions.ts        — joinClass server action
│       │       └── loading.tsx
│       └── profile/
│           ├── page.tsx              — View/edit profile
│           ├── actions.ts            — updateProfile server action
│           └── loading.tsx
└── lib/
    └── analytics.ts                  — Readiness score, mastery calculations
```

---

## Task 1: Analytics Utilities

**Files:**
- Create: `src/lib/analytics.ts`

- [ ] **Step 1: Create analytics module**

Create `src/lib/analytics.ts`:

```typescript
/**
 * Analytics calculations for the student dashboard.
 * All functions are pure — they take data and return computed values.
 */

interface CategoryAbility {
  categoryId: string;
  theta: number;
  questionsSeen: number;
  correctCount: number;
  examWeight: number;
  displayName: string;
}

/** Map theta to 0-100% mastery via logistic function. */
export function thetaToMastery(theta: number): number {
  return 100 / (1 + Math.exp(-theta));
}

/**
 * Compute overall exam readiness as a weighted average of per-category mastery.
 * Categories with questionsSeen = 0 contribute 0% (not the default 50%).
 */
export function computeReadiness(abilities: CategoryAbility[]): number {
  if (abilities.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const a of abilities) {
    totalWeight += a.examWeight;
    if (a.questionsSeen === 0) {
      // Unseen categories contribute 0%, not the 50% that theta=0 gives
      continue;
    }
    weightedSum += thetaToMastery(a.theta) * a.examWeight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/** Get per-category mastery data sorted by mastery ascending (weakest first). */
export function getCategoryMastery(
  abilities: CategoryAbility[]
): Array<{
  categoryId: string;
  displayName: string;
  mastery: number;
  questionsSeen: number;
  correctCount: number;
}> {
  return abilities
    .map((a) => ({
      categoryId: a.categoryId,
      displayName: a.displayName,
      mastery: a.questionsSeen > 0 ? Math.round(thetaToMastery(a.theta)) : 0,
      questionsSeen: a.questionsSeen,
      correctCount: a.correctCount,
    }))
    .sort((a, b) => a.mastery - b.mastery);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/analytics.ts
git commit -m "add analytics utilities: readiness score, mastery calculations"
```

---

## Task 2: Dashboard Components

**Files:**
- Create: `src/components/dashboard/stat-card.tsx`
- Create: `src/components/dashboard/mastery-chart.tsx`
- Create: `src/components/dashboard/readiness-gauge.tsx`
- Create: `src/components/dashboard/streak-display.tsx`
- Create: `src/components/dashboard/weak-topics.tsx`
- Create: `src/components/dashboard/trend-graph.tsx`

- [ ] **Step 1: Create StatCard**

Create `src/components/dashboard/stat-card.tsx`:

```typescript
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>}
    </Card>
  );
}
```

- [ ] **Step 2: Create MasteryChart**

Create `src/components/dashboard/mastery-chart.tsx`:

```typescript
interface MasteryChartProps {
  categories: Array<{
    displayName: string;
    mastery: number;
    questionsSeen: number;
  }>;
}

export function MasteryChart({ categories }: MasteryChartProps) {
  return (
    <div className="flex flex-col gap-3">
      {categories.map((cat) => (
        <div key={cat.displayName} className="flex items-center gap-3">
          <span className="w-40 truncate text-sm text-text-secondary">
            {cat.displayName}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${cat.mastery}%` }}
            />
          </div>
          <span className="w-12 text-right text-sm font-medium text-text-primary">
            {cat.questionsSeen > 0 ? `${cat.mastery}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create ReadinessGauge**

Create `src/components/dashboard/readiness-gauge.tsx`:

```typescript
interface ReadinessGaugeProps {
  readiness: number;
}

export function ReadinessGauge({ readiness }: ReadinessGaugeProps) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (readiness / 100) * circumference;

  const color =
    readiness >= 70 ? "#4CAF50" : readiness >= 40 ? "#F5A623" : "#E85D3A";

  return (
    <div className="flex flex-col items-center">
      <svg width="148" height="148" className="-rotate-90">
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          stroke="#FFF3E6"
          strokeWidth="12"
        />
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="-mt-24 text-center">
        <p className="font-heading text-4xl font-bold text-text-primary">
          {readiness}%
        </p>
        <p className="text-xs text-text-secondary">Exam Readiness</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create StreakDisplay**

Create `src/components/dashboard/streak-display.tsx`:

```typescript
interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
}: StreakDisplayProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl">🔥</span>
      <div>
        <p className="font-heading text-2xl font-bold text-text-primary">
          {currentStreak} day{currentStreak !== 1 ? "s" : ""}
        </p>
        <p className="text-xs text-text-secondary">
          Longest: {longestStreak} day{longestStreak !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create WeakTopics**

Create `src/components/dashboard/weak-topics.tsx`:

```typescript
import Link from "next/link";

interface WeakTopicsProps {
  topics: Array<{
    categoryId: string;
    displayName: string;
    mastery: number;
  }>;
}

export function WeakTopics({ topics }: WeakTopicsProps) {
  const weak = topics.slice(0, 5); // Top 5 weakest

  if (weak.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Start practicing to see your weak areas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {weak.map((topic) => (
        <div
          key={topic.categoryId}
          className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5"
        >
          <div>
            <p className="text-sm font-medium text-text-primary">
              {topic.displayName}
            </p>
            <p className="text-xs text-text-secondary">
              {topic.mastery}% mastery
            </p>
          </div>
          <Link
            href={`/practice?category=${topic.categoryId}`}
            className="text-xs font-medium text-accent hover:underline"
          >
            Practice
          </Link>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create TrendGraph**

Create `src/components/dashboard/trend-graph.tsx`:

```typescript
interface TrendGraphProps {
  sessions: Array<{
    date: string;
    score: number;
  }>;
}

export function TrendGraph({ sessions }: TrendGraphProps) {
  if (sessions.length < 2) {
    return (
      <p className="text-sm text-text-secondary">
        Complete more sessions to see your score trend.
      </p>
    );
  }

  const width = 400;
  const height = 120;
  const padding = 24;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const points = sessions.map((s, i) => ({
    x: padding + (i / (sessions.length - 1)) * graphWidth,
    y: padding + graphHeight - (s.score / 100) * graphHeight,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => {
        const y = padding + graphHeight - (pct / 100) * graphHeight;
        return (
          <g key={pct}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#FFF3E6"
              strokeWidth="1"
            />
            <text
              x={padding - 4}
              y={y + 3}
              textAnchor="end"
              className="fill-text-secondary"
              fontSize="8"
            >
              {pct}%
            </text>
          </g>
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke="#C67A1A" strokeWidth="2" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#C67A1A" />
      ))}
    </svg>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/
git commit -m "add dashboard components: stats, mastery, readiness, streaks, trends, weak topics"
```

---

## Task 3: Student Dashboard with Real Data

**Files:**
- Modify: `src/app/dashboard/page.tsx`

Replace the placeholder student dashboard with real data queries.

- [ ] **Step 1: Update dashboard page**

Replace `src/app/dashboard/page.tsx` with:

```typescript
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { computeReadiness, getCategoryMastery } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { MasteryChart } from "@/components/dashboard/mastery-chart";
import { ReadinessGauge } from "@/components/dashboard/readiness-gauge";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { WeakTopics } from "@/components/dashboard/weak-topics";
import { TrendGraph } from "@/components/dashboard/trend-graph";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (!role) redirect("/login");

  if (role === "teacher") {
    return <TeacherDashboard userId={user.id} />;
  }

  return <StudentDashboard userId={user.id} />;
}

async function StudentDashboard({ userId }: { userId: string }) {
  const admin = createAdminClient();

  // Fetch all data in parallel
  const [abilitiesResult, categoriesResult, streakResult, sessionsResult, responsesCount] =
    await Promise.all([
      admin.from("student_ability").select("*").eq("student_id", userId),
      admin.from("categories").select("id, display_name, exam_weight"),
      admin.from("streaks").select("*").eq("student_id", userId).single(),
      admin
        .from("sessions")
        .select("correct_count, question_count, started_at, completed_at")
        .eq("student_id", userId)
        .not("completed_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(20),
      admin
        .from("responses")
        .select("id", { count: "exact", head: true })
        .in(
          "session_id",
          // Get session IDs for this student
          (
            await admin.from("sessions").select("id").eq("student_id", userId)
          ).data?.map((s) => s.id) ?? []
        ),
    ]);

  const abilities = abilitiesResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const streak = streakResult.data;
  const sessions = sessionsResult.data ?? [];
  const totalAnswered = responsesCount.count ?? 0;

  // Compute analytics
  const categoryAbilities = categories.map((cat) => {
    const ability = abilities.find((a) => a.category_id === cat.id);
    return {
      categoryId: cat.id,
      theta: ability?.theta ?? 0,
      questionsSeen: ability?.questions_seen ?? 0,
      correctCount: ability?.correct_count ?? 0,
      examWeight: cat.exam_weight,
      displayName: cat.display_name,
    };
  });

  const readiness = computeReadiness(categoryAbilities);
  const mastery = getCategoryMastery(categoryAbilities);

  const totalCorrect = abilities.reduce((sum, a) => sum + a.correct_count, 0);
  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const trendData = sessions.map((s) => ({
    date: s.started_at,
    score:
      s.question_count > 0
        ? Math.round((s.correct_count / s.question_count) * 100)
        : 0,
  }));

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Dashboard
      </h2>
      <p className="mt-1 text-text-secondary">
        Track your progress and keep improving.
      </p>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Questions Answered" value={totalAnswered} />
        <StatCard
          label="Accuracy"
          value={totalAnswered > 0 ? `${accuracy}%` : "—"}
        />
        <StatCard
          label="Sessions Completed"
          value={sessions.length}
        />
        <div className="flex items-center rounded-xl bg-surface p-6">
          <StreakDisplay
            currentStreak={streak?.current_streak ?? 0}
            longestStreak={streak?.longest_streak ?? 0}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Readiness + Mastery */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Category Mastery
            </h3>
            <div className="mt-4">
              <MasteryChart categories={mastery} />
            </div>
          </Card>

          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Score Trend
            </h3>
            <div className="mt-4">
              <TrendGraph sessions={trendData} />
            </div>
          </Card>
        </div>

        {/* Right: Readiness + Weak Topics */}
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex justify-center py-2">
              <ReadinessGauge readiness={readiness} />
            </div>
          </Card>

          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Weak Topics
            </h3>
            <div className="mt-3">
              <WeakTopics topics={mastery} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function TeacherDashboard({ userId }: { userId: string }) {
  const admin = createAdminClient();

  const [classesResult, assignmentsResult] = await Promise.all([
    admin.from("classes").select("id").eq("teacher_id", userId),
    admin.from("assignments").select("id").eq("created_by", userId),
  ]);

  const classIds = (classesResult.data ?? []).map((c) => c.id);
  const { count: studentCount } = await admin
    .from("class_members")
    .select("id", { count: "exact", head: true })
    .in("class_id", classIds.length > 0 ? classIds : ["__none__"]);

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Dashboard
      </h2>
      <p className="mt-1 text-text-secondary">
        Manage your classes and track student progress.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Classes" value={classesResult.data?.length ?? 0} />
        <StatCard label="Total Students" value={studentCount ?? 0} />
        <StatCard
          label="Active Assignments"
          value={assignmentsResult.data?.length ?? 0}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "update dashboard with real analytics: mastery, readiness, streaks, trends"
```

---

## Task 4: Student Assignments Page

**Files:**
- Create: `src/app/(student)/assignments/page.tsx`
- Create: `src/app/(student)/assignments/loading.tsx`

- [ ] **Step 1: Create assignments page**

Create `src/app/(student)/assignments/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudentAssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "student") redirect("/dashboard");

  const admin = createAdminClient();

  // Get student's class memberships
  const { data: memberships } = await admin
    .from("class_members")
    .select("class_id")
    .eq("student_id", user.id);

  const classIds = (memberships ?? []).map((m) => m.class_id);

  // Get assignments for those classes
  const { data: assignments } = classIds.length > 0
    ? await admin
        .from("assignments")
        .select("*, classes(name)")
        .in("class_id", classIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // Get student's sessions to check completion
  const { data: sessions } = await admin
    .from("sessions")
    .select("assignment_id, completed_at, correct_count, question_count")
    .eq("student_id", user.id)
    .not("assignment_id", "is", null);

  const sessionsByAssignment = new Map(
    (sessions ?? []).map((s) => [s.assignment_id, s])
  );

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Assignments
      </h2>
      <p className="mt-1 text-text-secondary">
        Practice sets assigned by your teachers.
      </p>

      {(!assignments || assignments.length === 0) ? (
        <Card className="mt-6">
          <p className="text-center text-text-secondary">
            No assignments yet. Join a class to receive assignments.
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/classes/join">
              <Button variant="secondary">Join a Class</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {assignments.map((assignment) => {
            const session = sessionsByAssignment.get(assignment.id);
            const isComplete = !!session?.completed_at;
            const score =
              session && session.question_count > 0
                ? Math.round(
                    (session.correct_count / session.question_count) * 100
                  )
                : null;

            const isOverdue =
              assignment.deadline &&
              new Date(assignment.deadline) < new Date() &&
              !isComplete;

            return (
              <Card key={assignment.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-base font-bold text-text-primary">
                      {assignment.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {(assignment as Record<string, unknown> & { classes: { name: string } | null }).classes?.name ?? "Unknown class"} · {assignment.question_count} questions · {assignment.mode}
                    </p>
                    {assignment.deadline && (
                      <p
                        className={`mt-1 text-xs ${isOverdue ? "text-danger font-medium" : "text-text-secondary"}`}
                      >
                        {isOverdue ? "Overdue" : "Due"}: {new Date(assignment.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {isComplete ? (
                      <span className="inline-block rounded-lg bg-success/10 px-2 py-1 text-xs font-medium text-success">
                        {score}%
                      </span>
                    ) : (
                      <Link href={`/practice?assignment=${assignment.id}`}>
                        <Button size="sm">Start</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create loading skeleton**

Create `src/app/(student)/assignments/loading.tsx`:

```typescript
export default function AssignmentsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-surface" />
      <div className="mt-2 h-4 w-72 rounded-xl bg-surface" />
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(student\)/assignments/
git commit -m "add student assignments page: view teacher-assigned work"
```

---

## Task 5: Class Join Page

**Files:**
- Create: `src/app/(student)/classes/join/page.tsx`
- Create: `src/app/(student)/classes/join/actions.ts`
- Create: `src/app/(student)/classes/join/loading.tsx`

- [ ] **Step 1: Create join class server action**

Create `src/app/(student)/classes/join/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function joinClass(
  joinCode: string
): Promise<{ error?: string; className?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Look up class by join code (uses service role to bypass RLS)
  const { data: classData } = await admin
    .from("classes")
    .select("id, name")
    .eq("join_code", joinCode.trim().toUpperCase())
    .single();

  if (!classData) {
    return { error: "Invalid join code. Please check and try again." };
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("class_members")
    .select("id")
    .eq("class_id", classData.id)
    .eq("student_id", user.id)
    .single();

  if (existing) {
    return { error: "You are already a member of this class." };
  }

  // Join the class (student has INSERT permission via RLS)
  const { error } = await supabase.from("class_members").insert({
    class_id: classData.id,
    student_id: user.id,
  });

  if (error) {
    console.error("[class] failed to join", error);
    return { error: "Failed to join class. Please try again." };
  }

  console.info("[class] student joined class", {
    studentId: user.id,
    classId: classData.id,
    className: classData.name,
  });

  return { className: classData.name };
}
```

- [ ] **Step 2: Create join page**

Create `src/app/(student)/classes/join/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { joinClass } from "./actions";

export default function JoinClassPage() {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await joinClass(joinCode);

    if (result.error) {
      setError(result.error);
    } else if (result.className) {
      setSuccess(`Successfully joined "${result.className}"!`);
      setJoinCode("");
    }

    setLoading(false);
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Join a Class
      </h2>
      <p className="mt-1 text-text-secondary">
        Enter the join code provided by your teacher.
      </p>

      <div className="mt-6 max-w-md">
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Join Code"
              name="joinCode"
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase());
                setError(null);
              }}
              error={error ?? undefined}
              autoComplete="off"
            />

            {success && (
              <p className="text-sm font-medium text-success">{success}</p>
            )}

            <Button type="submit" disabled={loading || !joinCode.trim()}>
              {loading ? "Joining..." : "Join Class"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-text-secondary hover:text-accent"
            >
              Back to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `src/app/(student)/classes/join/loading.tsx`:

```typescript
export default function JoinClassLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-surface" />
      <div className="mt-2 h-4 w-64 rounded-xl bg-surface" />
      <div className="mt-6 h-48 max-w-md rounded-xl bg-surface" />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(student\)/classes/
git commit -m "add class join page: enter join code to join a teacher's class"
```

---

## Task 6: Profile Page

**Files:**
- Create: `src/app/(student)/profile/page.tsx`
- Create: `src/app/(student)/profile/actions.ts`
- Create: `src/app/(student)/profile/loading.tsx`

- [ ] **Step 1: Create profile update server action**

Create `src/app/(student)/profile/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function updateProfile(input: {
  firstName: string;
  lastName: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update failed", error);
    return { error: "Failed to update profile." };
  }

  return {};
}
```

- [ ] **Step 2: Create profile page**

Create `src/app/(student)/profile/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";

export default function ProfilePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFirstName(profile.first_name);
          setLastName(profile.last_name);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateProfile({ firstName, lastName });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-32 rounded-xl bg-surface" />
        <div className="mt-6 h-64 max-w-md rounded-xl bg-surface" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Profile
      </h2>
      <p className="mt-1 text-text-secondary">Manage your account details.</p>

      <div className="mt-6 max-w-md">
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              value={email}
              disabled
              onChange={() => {}}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
            {success && (
              <p className="text-sm text-success">Profile updated!</p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `src/app/(student)/profile/loading.tsx`:

```typescript
export default function ProfileLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 rounded-xl bg-surface" />
      <div className="mt-2 h-4 w-48 rounded-xl bg-surface" />
      <div className="mt-6 h-64 max-w-md rounded-xl bg-surface" />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(student\)/profile/
git commit -m "add profile page: view and edit name"
```

---

## Summary

Phase 3 delivers:
- **Analytics engine:** Readiness score (weighted theta), category mastery (logistic mapping)
- **Dashboard components:** StatCard, MasteryChart, ReadinessGauge, StreakDisplay, WeakTopics, TrendGraph
- **Real student dashboard:** Live data replacing placeholder cards
- **Assignments page:** View teacher-assigned work with completion status
- **Class join page:** Enter join code to join a teacher's class
- **Profile page:** View/edit name

**Next phase:** Phase 4 (Teacher Tools) builds class management, assignment creation, and the question bank browser.
