# Phase 4: Teacher Tools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the teacher-facing tools: class management (CRUD + roster), assignment creation, question bank browser, and per-student analytics.

**Architecture:** Teacher pages live under the `(teacher)` route group which provides the role guard. Server actions handle mutations. Class join codes are 6-character alphanumeric strings generated server-side.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase

**Spec Reference:** `docs/superpowers/specs/2026-04-11-hiraya-mvp-design.md`

---

## File Structure

```
src/
├── app/
│   └── (teacher)/
│       ├── classes/
│       │   ├── page.tsx              — List teacher's classes
│       │   ├── loading.tsx
│       │   ├── actions.ts            — createClass, deleteClass, removeStudent
│       │   ├── new/
│       │   │   └── page.tsx          — Create new class form
│       │   └── [classId]/
│       │       ├── page.tsx          — Class detail: roster + stats
│       │       ├── loading.tsx
│       │       └── students/
│       │           └── [studentId]/
│       │               └── page.tsx  — Individual student analytics
│       ├── assignments/
│       │   ├── page.tsx              — List teacher's assignments
│       │   ├── loading.tsx
│       │   ├── actions.ts            — createAssignment, deleteAssignment
│       │   └── new/
│       │       └── page.tsx          — Create assignment form
│       └── questions/
│           ├── page.tsx              — Browse question bank
│           └── loading.tsx
└── lib/
    └── utils.ts                      — generateJoinCode + shared helpers
```

---

## Task 1: Utility Functions

**Files:**
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Create utils module**

Create `src/lib/utils.ts`:

```typescript
/** Generate a 6-character alphanumeric join code. */
export function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O/1/I for clarity
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Format a date string for display. */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "add utility functions: join code generation, date formatting"
```

---

## Task 2: Class Management Server Actions

**Files:**
- Create: `src/app/(teacher)/classes/actions.ts`

- [ ] **Step 1: Create class actions**

Create `src/app/(teacher)/classes/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/utils";

export async function createClass(input: {
  name: string;
}): Promise<{ classId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Generate unique join code with retry
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("classes")
      .select("id")
      .eq("join_code", joinCode)
      .single();

    if (!existing) break;
    joinCode = generateJoinCode();
    attempts++;
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      name: input.name.trim(),
      teacher_id: user.id,
      join_code: joinCode,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[class] create failed", error);
    return { error: "Failed to create class." };
  }

  console.info("[class] created", { classId: data.id, joinCode });
  revalidatePath("/classes");
  return { classId: data.id };
}

export async function deleteClass(
  classId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("teacher_id", user.id);

  if (error) {
    console.error("[class] delete failed", error);
    return { error: "Failed to delete class." };
  }

  revalidatePath("/classes");
  return {};
}

export async function removeStudent(
  classId: string,
  studentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify teacher owns this class
  const { data: classData } = await supabase
    .from("classes")
    .select("teacher_id")
    .eq("id", classId)
    .single();

  if (!classData || classData.teacher_id !== user.id) {
    return { error: "Not authorized." };
  }

  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId);

  if (error) {
    console.error("[class] remove student failed", error);
    return { error: "Failed to remove student." };
  }

  revalidatePath(`/classes/${classId}`);
  return {};
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(teacher\)/classes/actions.ts
git commit -m "add class management server actions: create, delete, remove student"
```

---

## Task 3: Classes List + Create Pages

**Files:**
- Create: `src/app/(teacher)/classes/page.tsx`
- Create: `src/app/(teacher)/classes/loading.tsx`
- Create: `src/app/(teacher)/classes/new/page.tsx`

- [ ] **Step 1: Create classes list page**

Create `src/app/(teacher)/classes/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // Get member counts
  const admin = createAdminClient();
  const classIds = (classes ?? []).map((c) => c.id);
  const memberCounts = new Map<string, number>();

  if (classIds.length > 0) {
    for (const classId of classIds) {
      const { count } = await admin
        .from("class_members")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId);
      memberCounts.set(classId, count ?? 0);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            Classes
          </h2>
          <p className="mt-1 text-text-secondary">
            Manage your classes and view student rosters.
          </p>
        </div>
        <Link href="/classes/new">
          <Button>Create Class</Button>
        </Link>
      </div>

      {(!classes || classes.length === 0) ? (
        <Card className="mt-6">
          <p className="text-center text-text-secondary">
            No classes yet. Create one to get started.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/classes/${cls.id}`}>
              <Card className="transition-shadow hover:shadow-warm-lg">
                <h3 className="font-heading text-lg font-bold text-text-primary">
                  {cls.name}
                </h3>
                <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
                  <span>{memberCounts.get(cls.id) ?? 0} students</span>
                  <span className="rounded-lg bg-surface px-2 py-0.5 font-mono text-xs">
                    {cls.join_code}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create loading skeleton**

Create `src/app/(teacher)/classes/loading.tsx`:

```typescript
export default function ClassesLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-xl bg-surface" />
        <div className="h-10 w-32 rounded-xl bg-surface" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create new class page**

Create `src/app/(teacher)/classes/new/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClass } from "../actions";

export default function NewClassPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const result = await createClass({ name });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.classId) {
      router.push(`/classes/${result.classId}`);
    }
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Create a Class
      </h2>
      <p className="mt-1 text-text-secondary">
        Students will use a join code to enter your class.
      </p>

      <div className="mt-6 max-w-md">
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Class Name"
              name="name"
              placeholder="e.g. FE Review — Section A"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              error={error ?? undefined}
            />
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Class"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(teacher\)/classes/page.tsx src/app/\(teacher\)/classes/loading.tsx src/app/\(teacher\)/classes/new/
git commit -m "add classes list and create pages for teachers"
```

---

## Task 4: Class Detail + Student Analytics Pages

**Files:**
- Create: `src/app/(teacher)/classes/[classId]/page.tsx`
- Create: `src/app/(teacher)/classes/[classId]/loading.tsx`
- Create: `src/app/(teacher)/classes/[classId]/students/[studentId]/page.tsx`

- [ ] **Step 1: Create class detail page**

Create `src/app/(teacher)/classes/[classId]/page.tsx`:

```typescript
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface ClassDetailPageProps {
  params: Promise<{ classId: string }>;
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { classId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  // Get class info
  const { data: classData } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single();

  if (!classData) notFound();

  const admin = createAdminClient();

  // Get members with profile info
  const { data: members } = await admin
    .from("class_members")
    .select("student_id, joined_at")
    .eq("class_id", classId);

  const studentIds = (members ?? []).map((m) => m.student_id);
  const { data: profiles } = studentIds.length > 0
    ? await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", studentIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Get session stats per student
  const studentStats = new Map<string, { sessions: number; avgScore: number }>();
  for (const studentId of studentIds) {
    const { data: sessions } = await admin
      .from("sessions")
      .select("correct_count, question_count")
      .eq("student_id", studentId)
      .not("completed_at", "is", null);

    const completed = sessions ?? [];
    const totalCorrect = completed.reduce((s, x) => s + x.correct_count, 0);
    const totalQuestions = completed.reduce((s, x) => s + x.question_count, 0);

    studentStats.set(studentId, {
      sessions: completed.length,
      avgScore: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            {classData.name}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
            <span>Join Code:</span>
            <span className="rounded-lg bg-surface px-3 py-1 font-mono text-base font-bold text-accent">
              {classData.join_code}
            </span>
          </div>
        </div>
        <Link href="/classes" className="text-sm text-text-secondary hover:text-accent">
          Back to Classes
        </Link>
      </div>

      <Card className="mt-6">
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Students ({studentIds.length})
        </h3>

        {studentIds.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">
            No students yet. Share the join code to invite students.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface text-text-secondary">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Sessions</th>
                  <th className="pb-2 font-medium">Avg Score</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {(members ?? []).map((member) => {
                  const profile = profileMap.get(member.student_id);
                  const stats = studentStats.get(member.student_id);

                  return (
                    <tr
                      key={member.student_id}
                      className="border-b border-surface/50"
                    >
                      <td className="py-3">
                        <Link
                          href={`/classes/${classId}/students/${member.student_id}`}
                          className="font-medium text-text-primary hover:text-accent"
                        >
                          {profile?.display_name ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="py-3 text-text-secondary">
                        {stats?.sessions ?? 0}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {stats?.sessions ? `${stats.avgScore}%` : "—"}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {formatDate(member.joined_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create class detail loading**

Create `src/app/(teacher)/classes/[classId]/loading.tsx`:

```typescript
export default function ClassDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-surface" />
      <div className="mt-2 h-6 w-32 rounded-xl bg-surface" />
      <div className="mt-6 h-64 rounded-xl bg-surface" />
    </div>
  );
}
```

- [ ] **Step 3: Create student detail page**

Create `src/app/(teacher)/classes/[classId]/students/[studentId]/page.tsx`:

```typescript
import { redirect, notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { computeReadiness, getCategoryMastery } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { MasteryChart } from "@/components/dashboard/mastery-chart";
import { ReadinessGauge } from "@/components/dashboard/readiness-gauge";

interface StudentDetailPageProps {
  params: Promise<{ classId: string; studentId: string }>;
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { classId, studentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  // Verify teacher owns this class
  const { data: classData } = await supabase
    .from("classes")
    .select("name, teacher_id")
    .eq("id", classId)
    .single();

  if (!classData || classData.teacher_id !== user.id) notFound();

  const admin = createAdminClient();

  // Get student profile
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", studentId)
    .single();

  if (!profile) notFound();

  // Get student data
  const [abilitiesResult, categoriesResult, streakResult, sessionsResult] =
    await Promise.all([
      admin.from("student_ability").select("*").eq("student_id", studentId),
      admin.from("categories").select("id, display_name, exam_weight"),
      admin.from("streaks").select("*").eq("student_id", studentId).single(),
      admin
        .from("sessions")
        .select("correct_count, question_count, completed_at")
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .order("started_at", { ascending: false }),
    ]);

  const abilities = abilitiesResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const streak = streakResult.data;
  const sessions = sessionsResult.data ?? [];

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

  const totalAnswered = abilities.reduce((s, a) => s + a.questions_seen, 0);
  const totalCorrect = abilities.reduce((s, a) => s + a.correct_count, 0);
  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return (
    <div>
      <p className="text-sm text-text-secondary">
        {classData.name} &rsaquo; Student
      </p>
      <h2 className="mt-1 font-heading text-2xl font-bold text-text-primary">
        {profile.display_name}
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Questions Answered" value={totalAnswered} />
        <StatCard label="Accuracy" value={totalAnswered > 0 ? `${accuracy}%` : "—"} />
        <StatCard label="Sessions" value={sessions.length} />
        <StatCard
          label="Streak"
          value={`${streak?.current_streak ?? 0} days`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Category Mastery
            </h3>
            <div className="mt-4">
              <MasteryChart categories={mastery} />
            </div>
          </Card>
        </div>
        <Card>
          <div className="flex justify-center py-2">
            <ReadinessGauge readiness={readiness} />
          </div>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(teacher\)/classes/\[classId\]/
git commit -m "add class detail and student analytics pages for teachers"
```

---

## Task 5: Assignment Management

**Files:**
- Create: `src/app/(teacher)/assignments/actions.ts`
- Create: `src/app/(teacher)/assignments/page.tsx`
- Create: `src/app/(teacher)/assignments/loading.tsx`
- Create: `src/app/(teacher)/assignments/new/page.tsx`

- [ ] **Step 1: Create assignment server actions**

Create `src/app/(teacher)/assignments/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

interface CreateAssignmentInput {
  classId: string;
  title: string;
  mode: "study" | "exam";
  categoryIds: string[];
  questionCount: number;
  timeLimitMinutes: number | null;
  deadline: string | null;
  maxAttempts: number;
}

export async function createAssignment(
  input: CreateAssignmentInput
): Promise<{ assignmentId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      class_id: input.classId,
      created_by: user.id,
      title: input.title.trim(),
      mode: input.mode,
      category_ids: input.categoryIds.length > 0 ? input.categoryIds : null,
      question_count: input.questionCount,
      time_limit_minutes: input.timeLimitMinutes,
      deadline: input.deadline,
      max_attempts: input.maxAttempts,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[assignment] create failed", error);
    return { error: "Failed to create assignment." };
  }

  console.info("[assignment] created", { assignmentId: data.id });
  revalidatePath("/assignments");
  return { assignmentId: data.id };
}

export async function deleteAssignment(
  assignmentId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("created_by", user.id);

  if (error) {
    console.error("[assignment] delete failed", error);
    return { error: "Failed to delete assignment." };
  }

  revalidatePath("/assignments");
  return {};
}
```

- [ ] **Step 2: Create assignments list page**

Create `src/app/(teacher)/assignments/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*, classes(name)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            Assignments
          </h2>
          <p className="mt-1 text-text-secondary">
            Create and manage practice assignments for your classes.
          </p>
        </div>
        <Link href="/assignments/new">
          <Button>Create Assignment</Button>
        </Link>
      </div>

      {(!assignments || assignments.length === 0) ? (
        <Card className="mt-6">
          <p className="text-center text-text-secondary">
            No assignments yet. Create one for your class.
          </p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {assignments.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-base font-bold text-text-primary">
                    {a.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {(a as Record<string, unknown> & { classes: { name: string } | null }).classes?.name ?? "Unknown"} · {a.question_count} questions · {a.mode}
                  </p>
                  {a.deadline && (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Due: {formatDate(a.deadline)}
                    </p>
                  )}
                </div>
                <span className="rounded-lg bg-surface px-2 py-1 text-xs text-text-secondary">
                  {formatDate(a.created_at)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create loading skeleton**

Create `src/app/(teacher)/assignments/loading.tsx`:

```typescript
export default function AssignmentsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-surface" />
        <div className="h-10 w-40 rounded-xl bg-surface" />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create new assignment page**

Create `src/app/(teacher)/assignments/new/page.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { createAssignment } from "../actions";

const QUESTION_COUNTS = [10, 20, 30, 50] as const;

export default function NewAssignmentPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; display_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"study" | "exam">("study");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [classesRes, catsRes] = await Promise.all([
        supabase.from("classes").select("id, name").order("name"),
        supabase.from("categories").select("id, display_name").order("display_name"),
      ]);
      setClasses(classesRes.data ?? []);
      setCategories(catsRes.data ?? []);
      if (classesRes.data?.[0]) setClassId(classesRes.data[0].id);
      setLoading(false);
    }
    load();
  }, []);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!classId || !title.trim()) return;

    setSubmitting(true);
    setError(null);

    const result = await createAssignment({
      classId,
      title,
      mode,
      categoryIds: selectedCategories,
      questionCount,
      timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : null,
      deadline: deadline || null,
      maxAttempts,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.push("/assignments");
    }
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-xl bg-surface" />;
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Create Assignment
      </h2>
      <p className="mt-1 text-text-secondary">
        Assign practice to your students.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex max-w-lg flex-col gap-6">
        <Card>
          <div className="flex flex-col gap-4">
            <Select
              label="Class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Input
              label="Title"
              placeholder="e.g. Week 3 — Database Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-base font-bold text-text-primary">
            Mode
          </h3>
          <div className="mt-3 flex gap-3">
            {(["study", "exam"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  mode === m
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-surface text-text-secondary"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-heading text-base font-bold text-text-primary">
            Topics
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Leave empty for all topics.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-xl border-2 px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategories.includes(cat.id)
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-surface text-text-secondary"
                }`}
              >
                {cat.display_name}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-heading text-base font-bold text-text-primary">
                Questions
              </h3>
              <div className="mt-3 flex gap-3">
                {QUESTION_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
                      questionCount === count
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-surface text-text-secondary"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {mode === "exam" && (
              <Input
                label="Time Limit (minutes)"
                type="number"
                placeholder="e.g. 75"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
              />
            )}

            <Input
              label="Deadline (optional)"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />

            <Input
              label="Max Attempts"
              type="number"
              value={maxAttempts.toString()}
              onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
            />
          </div>
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting || !classId || !title.trim()}>
          {submitting ? "Creating..." : "Create Assignment"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(teacher\)/assignments/
git commit -m "add teacher assignment management: list, create with options"
```

---

## Task 6: Question Bank Browser

**Files:**
- Create: `src/app/(teacher)/questions/page.tsx`
- Create: `src/app/(teacher)/questions/loading.tsx`

- [ ] **Step 1: Create question bank page**

Create `src/app/(teacher)/questions/page.tsx`:

```typescript
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";

interface QuestionsPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  const admin = createAdminClient();

  // Get categories for filter
  const { data: categories } = await admin
    .from("categories")
    .select("id, display_name")
    .order("display_name");

  // Get questions with optional category filter
  let query = admin
    .from("questions")
    .select("*, categories(display_name)")
    .order("category_id")
    .order("difficulty");

  if (category) {
    query = query.eq("category_id", category);
  }

  const { data: questions } = await query;

  const OPTION_LABELS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Question Bank
      </h2>
      <p className="mt-1 text-text-secondary">
        Browse all available PhilNITS questions. {questions?.length ?? 0} questions total.
      </p>

      {/* Category filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/questions"
          className={`rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
            !category
              ? "border-accent bg-accent/10 text-accent"
              : "border-surface text-text-secondary hover:border-accent/30"
          }`}
        >
          All
        </a>
        {(categories ?? []).map((cat) => (
          <a
            key={cat.id}
            href={`/questions?category=${cat.id}`}
            className={`rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
              category === cat.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-surface text-text-secondary hover:border-accent/30"
            }`}
          >
            {cat.display_name}
          </a>
        ))}
      </div>

      {/* Questions list */}
      <div className="mt-6 flex flex-col gap-4">
        {(questions ?? []).map((q, index) => (
          <Card key={q.id} padding="sm">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface font-heading text-xs font-bold text-text-secondary">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {q.question_text}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-text-secondary">
                  {(["a", "b", "c", "d"] as const).map((key) => {
                    const text = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d }[key];
                    const isCorrect = key === q.correct_answer;
                    return (
                      <span
                        key={key}
                        className={isCorrect ? "font-medium text-success" : ""}
                      >
                        {OPTION_LABELS[key]}. {text}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2">
                  <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-secondary">
                    {(q as Record<string, unknown> & { categories: { display_name: string } | null }).categories?.display_name}
                  </span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-secondary">
                    {q.exam_source}
                  </span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-secondary">
                    Difficulty: {q.difficulty.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create loading skeleton**

Create `src/app/(teacher)/questions/loading.tsx`:

```typescript
export default function QuestionsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-surface" />
      <div className="mt-2 h-4 w-64 rounded-xl bg-surface" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-xl bg-surface" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(teacher\)/questions/
git commit -m "add question bank browser: filterable question list for teachers"
```

---

## Summary

Phase 4 delivers:
- **Class management:** Create classes with auto-generated join codes, view roster, student stats
- **Student analytics:** Per-student mastery, readiness, session history (reuses Phase 3 dashboard components)
- **Assignment creation:** Full form with mode, categories, question count, deadline, max attempts
- **Question bank:** Browseable, filterable question list with correct answers highlighted
- **Utility functions:** Join code generation, date formatting

**The MVP is complete after Phase 4.** All features from the design spec are implemented:
- Students can practice (study/exam), view progress, join classes, complete assignments
- Teachers can manage classes, create assignments, browse questions, view student analytics
- The adaptive engine (IRT + spaced repetition) selects questions and tracks ability
