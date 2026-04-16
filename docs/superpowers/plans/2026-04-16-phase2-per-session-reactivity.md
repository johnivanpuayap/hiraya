# Phase 2: Per-Session Reactivity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all mutations update the UI instantly with optimistic updates, Zustand stores, and toast notifications.

**Architecture:** One Zustand store per entity (classes, assignments, class members, profile, sessions) plus a toast store. A shared `performOptimisticUpdate` utility handles the update → server call → rollback → toast flow. Server components hydrate stores via `<StoreHydrator />` components. A `<Toaster />` in the root layout renders toast notifications.

**Tech Stack:** Zustand, React 19, Next.js 16 App Router, Tailwind CSS, existing Supabase server actions

---

### Task 1: Install Zustand

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install zustand**

Run: `npm install zustand`

- [ ] **Step 2: Verify installation**

Run: `npm ls zustand`
Expected: `zustand@5.x.x` (or latest)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "add zustand dependency for client-side state management"
```

---

### Task 2: Toast Store

**Files:**
- Create: `src/stores/toast-store.ts`

- [ ] **Step 1: Create the toast store**

```typescript
// src/stores/toast-store.ts
import { create } from "zustand";

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
  onRetry?: () => void;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/stores/toast-store.ts 2>&1 || npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/stores/toast-store.ts
git commit -m "add toast store with zustand"
```

---

### Task 3: Toaster Component

**Files:**
- Create: `src/components/ui/toaster.tsx`

- [ ] **Step 1: Create the Toaster component**

```typescript
// src/components/ui/toaster.tsx
"use client";

import { useEffect, useRef } from "react";

import { useToastStore } from "@/stores/toast-store";

const AUTO_DISMISS_MS = 4000;

export function Toaster(): React.ReactNode {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onRetry={toast.onRetry}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  id: string;
  type: "success" | "error";
  message: string;
  onRetry?: () => void;
  onDismiss: (id: string) => void;
}

function ToastItem({ id, type, message, onRetry, onDismiss }: ToastItemProps): React.ReactNode {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type === "success") {
      timerRef.current = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, type, onDismiss]);

  const isError = type === "error";

  return (
    <div
      className="animate-slide-in-right flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-warm backdrop-blur-xl"
      style={{
        background: "rgba(255, 250, 240, 0.75)",
        borderColor: isError
          ? "rgba(191, 74, 45, 0.2)"
          : "rgba(199, 123, 26, 0.15)",
        maxWidth: "340px",
      }}
    >
      {/* Icon */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
        style={{
          background: isError
            ? "rgba(191, 74, 45, 0.12)"
            : "rgba(90, 142, 76, 0.15)",
          color: isError ? "#BF4A2D" : "#5A8E4C",
        }}
      >
        {isError ? "\u2715" : "\u2713"}
      </div>

      {/* Message */}
      <span className="flex-1 text-sm text-text-primary">{message}</span>

      {/* Retry button (error only) */}
      {isError && onRetry && (
        <button
          onClick={() => {
            onDismiss(id);
            onRetry();
          }}
          className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-colors hover:opacity-80"
          style={{
            background: "rgba(191, 74, 45, 0.08)",
            border: "1px solid rgba(191, 74, 45, 0.2)",
            color: "#BF4A2D",
          }}
        >
          Retry
        </button>
      )}

      {/* Dismiss button (error only, for manual dismissal) */}
      {isError && (
        <button
          onClick={() => onDismiss(id)}
          className="shrink-0 text-text-muted hover:text-text-secondary"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the slide-in animation to globals.css**

Add this at the end of `src/app/globals.css`:

```css
@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
```

- [ ] **Step 3: Add `<Toaster />` to the root layout**

Modify `src/app/layout.tsx` to import and render `<Toaster />` inside `<body>`:

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";

import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif-display",
  display: "swap",
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Hiraya — Study smart. Rise ready.",
  description:
    "Your adaptive PhilNITS exam reviewer. Hiraya tracks what you know, finds what you don't, and builds a study path uniquely yours.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="bg-atmosphere font-body text-text-primary antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/toaster.tsx src/app/globals.css src/app/layout.tsx
git commit -m "add toaster component with golden study nook styling"
```

---

### Task 4: Optimistic Update Utility

**Files:**
- Create: `src/lib/optimistic-update.ts`

- [ ] **Step 1: Create the shared optimistic update utility**

```typescript
// src/lib/optimistic-update.ts
import { useToastStore } from "@/stores/toast-store";

interface OptimisticUpdateOptions {
  optimisticFn: () => void;
  serverFn: () => Promise<{ error?: string }>;
  rollbackFn: () => void;
  successMessage: string;
  errorMessage: string;
}

export async function performOptimisticUpdate({
  optimisticFn,
  serverFn,
  rollbackFn,
  successMessage,
  errorMessage,
}: OptimisticUpdateOptions): Promise<void> {
  const { addToast } = useToastStore.getState();

  // Apply optimistic update immediately
  optimisticFn();
  addToast({ type: "success", message: successMessage });

  // Call server in background
  const result = await serverFn();

  if (result.error) {
    // Rollback and show error toast with retry
    rollbackFn();

    // Remove the success toast (it's stale now)
    const { toasts, removeToast } = useToastStore.getState();
    const successToast = toasts.find(
      (t) => t.type === "success" && t.message === successMessage
    );
    if (successToast) {
      removeToast(successToast.id);
    }

    addToast({
      type: "error",
      message: errorMessage,
      onRetry: () =>
        performOptimisticUpdate({
          optimisticFn,
          serverFn,
          rollbackFn,
          successMessage,
          errorMessage,
        }),
    });
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/lib/optimistic-update.ts
git commit -m "add shared optimistic update utility with rollback and retry"
```

---

### Task 5: Class Store + Hydrator

**Files:**
- Create: `src/stores/class-store.ts`
- Create: `src/components/hydrators/class-store-hydrator.tsx`

- [ ] **Step 1: Create the class store**

```typescript
// src/stores/class-store.ts
import { create } from "zustand";

import { performOptimisticUpdate } from "@/lib/optimistic-update";
import {
  createClass as createClassAction,
  deleteClass as deleteClassAction,
} from "@/app/(teacher)/classes/actions";

interface ClassItem {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  teacher_id: string;
  updated_at: string;
}

interface ClassStore {
  classes: ClassItem[];
  memberCounts: Map<string, number>;
  hydrate: (classes: ClassItem[], memberCounts: Map<string, number>) => void;
  addClass: (name: string) => Promise<string | null>;
  deleteClass: (classId: string) => Promise<void>;
}

export const useClassStore = create<ClassStore>((set, get) => ({
  classes: [],
  memberCounts: new Map(),

  hydrate: (classes, memberCounts) => set({ classes, memberCounts }),

  addClass: async (name) => {
    // For create, we don't know the ID/join_code yet, so we call server first
    // then add to store on success. Toast on result.
    const { addToast } = await import("@/stores/toast-store").then((m) => m.useToastStore.getState());

    const result = await createClassAction({ name });

    if (result.error) {
      addToast({
        type: "error",
        message: result.error,
        onRetry: () => get().addClass(name),
      });
      return null;
    }

    if (result.classId) {
      // We don't have the full class object from the server action,
      // but we can construct a placeholder. The page will redirect anyway.
      addToast({ type: "success", message: "Class created" });
      return result.classId;
    }

    return null;
  },

  deleteClass: async (classId) => {
    const { classes, memberCounts } = get();
    const deletedClass = classes.find((c) => c.id === classId);
    if (!deletedClass) return;

    const previousClasses = [...classes];
    const previousCounts = new Map(memberCounts);

    await performOptimisticUpdate({
      optimisticFn: () =>
        set({
          classes: classes.filter((c) => c.id !== classId),
        }),
      serverFn: () => deleteClassAction(classId),
      rollbackFn: () =>
        set({ classes: previousClasses, memberCounts: previousCounts }),
      successMessage: `"${deletedClass.name}" deleted`,
      errorMessage: `Failed to delete "${deletedClass.name}"`,
    });
  },
}));
```

- [ ] **Step 2: Create the class store hydrator**

```typescript
// src/components/hydrators/class-store-hydrator.tsx
"use client";

import { useRef } from "react";

import { useClassStore } from "@/stores/class-store";

interface ClassItem {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  teacher_id: string;
  updated_at: string;
}

interface ClassStoreHydratorProps {
  classes: ClassItem[];
  memberCounts: Map<string, number>;
}

export function ClassStoreHydrator({
  classes,
  memberCounts,
}: ClassStoreHydratorProps): null {
  const hydrated = useRef(false);
  if (!hydrated.current) {
    useClassStore.getState().hydrate(classes, memberCounts);
    hydrated.current = true;
  }
  return null;
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/stores/class-store.ts src/components/hydrators/class-store-hydrator.tsx
git commit -m "add class store and hydrator for optimistic class mutations"
```

---

### Task 6: Migrate Teacher Classes List Page

**Files:**
- Modify: `src/app/(teacher)/classes/page.tsx`
- Create: `src/app/(teacher)/classes/class-list.tsx`

- [ ] **Step 1: Create the reactive class list client component**

```typescript
// src/app/(teacher)/classes/class-list.tsx
"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { useClassStore } from "@/stores/class-store";

export function ClassList(): React.ReactNode {
  const classes = useClassStore((s) => s.classes);
  const memberCounts = useClassStore((s) => s.memberCounts);

  if (classes.length === 0) {
    return (
      <Card className="mt-6">
        <p className="text-center text-text-secondary">
          No classes yet. Create one to get started.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {classes.map((cls) => (
        <Link key={cls.id} href={`/classes/${cls.id}`}>
          <Card hover>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              {cls.name}
            </h3>
            <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
              <span>{memberCounts.get(cls.id) ?? 0} students</span>
              <span className="rounded-lg glass px-2 py-0.5 font-mono text-xs">
                {cls.join_code}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update the teacher classes page to use hydrator + reactive list**

Replace the contents of `src/app/(teacher)/classes/page.tsx`:

```typescript
// src/app/(teacher)/classes/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ClassStoreHydrator } from "@/components/hydrators/class-store-hydrator";
import { ClassList } from "./class-list";

export default async function ClassesPage() {
  const { user, role } = await getAuthenticatedUser();

  if (!user) redirect("/login");
  if (role !== "teacher") redirect("/dashboard");

  const admin = createAdminClient();

  const { data: classes } = await admin
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // Get member counts in parallel
  const classIds = (classes ?? []).map((c) => c.id);
  const memberCounts = new Map<string, number>();

  if (classIds.length > 0) {
    const results = await Promise.all(
      classIds.map((classId) =>
        admin
          .from("class_members")
          .select("id", { count: "exact", head: true })
          .eq("class_id", classId)
          .then(({ count }) => [classId, count ?? 0] as const)
      )
    );
    for (const [id, count] of results) {
      memberCounts.set(id, count);
    }
  }

  return (
    <div>
      <ClassStoreHydrator
        classes={classes ?? []}
        memberCounts={memberCounts}
      />

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

      <ClassList />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/(teacher)/classes/page.tsx src/app/(teacher)/classes/class-list.tsx
git commit -m "migrate teacher classes list to reactive zustand store"
```

---

### Task 7: Migrate Create Class Form

**Files:**
- Modify: `src/app/(teacher)/classes/new/page.tsx`

- [ ] **Step 1: Update the create class page to use the store**

Replace the contents of `src/app/(teacher)/classes/new/page.tsx`:

```typescript
// src/app/(teacher)/classes/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClassStore } from "@/stores/class-store";

export default function NewClassPage() {
  const router = useRouter();
  const addClass = useClassStore((s) => s.addClass);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const classId = await addClass(name);

    if (classId) {
      router.push(`/classes/${classId}`);
    } else {
      setLoading(false);
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
              onChange={(e) => setName(e.target.value)}
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

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/(teacher)/classes/new/page.tsx
git commit -m "migrate create class form to use class store with toast feedback"
```

---

### Task 8: Assignment Store + Hydrator

**Files:**
- Create: `src/stores/assignment-store.ts`
- Create: `src/components/hydrators/assignment-store-hydrator.tsx`

- [ ] **Step 1: Create the assignment store**

```typescript
// src/stores/assignment-store.ts
import { create } from "zustand";

import { performOptimisticUpdate } from "@/lib/optimistic-update";
import {
  createAssignment as createAssignmentAction,
  deleteAssignment as deleteAssignmentAction,
} from "@/app/assignments/actions";

import type { Database } from "@/types/database";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];

interface AssignmentStore {
  assignments: AssignmentRow[];
  classNameMap: Map<string, string>;
  hydrate: (assignments: AssignmentRow[], classNameMap: Map<string, string>) => void;
  addAssignment: (input: {
    classId: string;
    title: string;
    mode: "study" | "exam";
    categoryIds: string[];
    questionCount: number;
    timeLimitMinutes: number | null;
    deadline: string | null;
    maxAttempts: number;
  }) => Promise<string | null>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
}

export const useAssignmentStore = create<AssignmentStore>((set, get) => ({
  assignments: [],
  classNameMap: new Map(),

  hydrate: (assignments, classNameMap) => set({ assignments, classNameMap }),

  addAssignment: async (input) => {
    const { addToast } = await import("@/stores/toast-store").then((m) => m.useToastStore.getState());

    const result = await createAssignmentAction(input);

    if (result.error) {
      addToast({
        type: "error",
        message: result.error,
        onRetry: () => get().addAssignment(input),
      });
      return null;
    }

    if (result.assignmentId) {
      addToast({ type: "success", message: "Assignment created" });
      return result.assignmentId;
    }

    return null;
  },

  deleteAssignment: async (assignmentId) => {
    const { assignments } = get();
    const deleted = assignments.find((a) => a.id === assignmentId);
    if (!deleted) return;

    const previousAssignments = [...assignments];

    await performOptimisticUpdate({
      optimisticFn: () =>
        set({
          assignments: assignments.filter((a) => a.id !== assignmentId),
        }),
      serverFn: () => deleteAssignmentAction(assignmentId),
      rollbackFn: () => set({ assignments: previousAssignments }),
      successMessage: `"${deleted.title}" deleted`,
      errorMessage: `Failed to delete "${deleted.title}"`,
    });
  },
}));
```

- [ ] **Step 2: Create the assignment store hydrator**

```typescript
// src/components/hydrators/assignment-store-hydrator.tsx
"use client";

import { useRef } from "react";

import { useAssignmentStore } from "@/stores/assignment-store";

import type { Database } from "@/types/database";

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];

interface AssignmentStoreHydratorProps {
  assignments: AssignmentRow[];
  classNameMap: Map<string, string>;
}

export function AssignmentStoreHydrator({
  assignments,
  classNameMap,
}: AssignmentStoreHydratorProps): null {
  const hydrated = useRef(false);
  if (!hydrated.current) {
    useAssignmentStore.getState().hydrate(assignments, classNameMap);
    hydrated.current = true;
  }
  return null;
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/stores/assignment-store.ts src/components/hydrators/assignment-store-hydrator.tsx
git commit -m "add assignment store and hydrator for optimistic assignment mutations"
```

---

### Task 9: Migrate Teacher Assignments Page

**Files:**
- Modify: `src/app/assignments/page.tsx`
- Create: `src/app/assignments/teacher-assignment-list.tsx`

- [ ] **Step 1: Create the reactive teacher assignment list**

```typescript
// src/app/assignments/teacher-assignment-list.tsx
"use client";

import { Card } from "@/components/ui/card";
import { useAssignmentStore } from "@/stores/assignment-store";
import { formatDate } from "@/lib/utils";

export function TeacherAssignmentList(): React.ReactNode {
  const assignments = useAssignmentStore((s) => s.assignments);
  const classNameMap = useAssignmentStore((s) => s.classNameMap);

  if (assignments.length === 0) {
    return (
      <Card className="mt-6">
        <p className="text-center text-text-secondary">
          No assignments yet. Create one for your class.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {assignments.map((a) => (
        <Card key={a.id} hover>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-heading text-base font-bold text-text-primary">
                {a.title}
              </h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                {classNameMap.get(a.class_id) ?? "Unknown"} &middot;{" "}
                {a.question_count} questions &middot; {a.mode}
              </p>
              {a.deadline && (
                <p className="mt-0.5 text-xs text-text-secondary">
                  Due: {formatDate(a.deadline)}
                </p>
              )}
            </div>
            <span className="rounded-lg glass border border-glass px-2 py-1 text-xs text-text-secondary">
              {formatDate(a.created_at)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update the assignments page**

Replace the contents of `src/app/assignments/page.tsx`. The `StudentAssignments` server component stays as-is since students don't mutate assignments. Only `TeacherAssignments` becomes reactive:

```typescript
// src/app/assignments/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";

import { getAuthenticatedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { AssignmentStoreHydrator } from "@/components/hydrators/assignment-store-hydrator";
import { TeacherAssignmentList } from "./teacher-assignment-list";

export default async function AssignmentsPage() {
  const { user, role } = await getAuthenticatedUser();

  if (!user) redirect("/login");

  if (!role) redirect("/login");

  if (role === "teacher") {
    return <TeacherAssignments userId={user.id} />;
  }

  return <StudentAssignments userId={user.id} />;
}

async function StudentAssignments({ userId }: { userId: string }) {
  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from("class_members")
    .select("class_id")
    .eq("student_id", userId);

  const classIds = (memberships ?? []).map((m) => m.class_id);

  const { data: assignments } =
    classIds.length > 0
      ? await admin
          .from("assignments")
          .select("*")
          .in("class_id", classIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const uniqueClassIds = [
    ...new Set((assignments ?? []).map((a) => a.class_id)),
  ];
  const { data: classes } =
    uniqueClassIds.length > 0
      ? await admin.from("classes").select("id, name").in("id", uniqueClassIds)
      : { data: [] };

  const classNameMap = new Map(
    (classes ?? []).map((c) => [c.id, c.name])
  );

  const { data: sessions } = await admin
    .from("sessions")
    .select("assignment_id, completed_at, correct_count, question_count")
    .eq("student_id", userId)
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

      {!assignments || assignments.length === 0 ? (
        <Card className="mt-6">
          <p className="text-center text-text-secondary">
            {classIds.length > 0
              ? "No assignments yet. Your teacher hasn\u2019t created any assignments."
              : "No assignments yet. Join a class to receive assignments."}
          </p>
          {classIds.length === 0 && (
            <div className="mt-4 flex justify-center">
              <Link href="/classes/join">
                <Button variant="secondary">Join a Class</Button>
              </Link>
            </div>
          )}
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
              <Card key={assignment.id} hover>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-base font-bold text-text-primary">
                      {assignment.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {classNameMap.get(assignment.class_id) ?? "Unknown class"}{" "}
                      · {assignment.question_count} questions ·{" "}
                      {assignment.mode}
                    </p>
                    {assignment.deadline && (
                      <p
                        className={`mt-1 text-xs ${isOverdue ? "font-medium text-danger" : "text-text-secondary"}`}
                      >
                        {isOverdue ? "Overdue" : "Due"}:{" "}
                        {new Date(assignment.deadline).toLocaleDateString()}
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

async function TeacherAssignments({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  const classIds = [
    ...new Set((assignments ?? []).map((a) => a.class_id)),
  ];
  const classNameMap = new Map<string, string>();

  if (classIds.length > 0) {
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .in("id", classIds);

    for (const cls of classes ?? []) {
      classNameMap.set(cls.id, cls.name);
    }
  }

  return (
    <div>
      <AssignmentStoreHydrator
        assignments={assignments ?? []}
        classNameMap={classNameMap}
      />

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

      <TeacherAssignmentList />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/assignments/page.tsx src/app/assignments/teacher-assignment-list.tsx
git commit -m "migrate teacher assignments list to reactive zustand store"
```

---

### Task 10: Migrate Create Assignment Form

**Files:**
- Modify: `src/app/assignments/new/page.tsx`

- [ ] **Step 1: Update create assignment page to use the store**

Read the current file first, then modify the `handleSubmit` function to use `useAssignmentStore` instead of calling the server action directly. The key changes:

1. Import `useAssignmentStore` instead of `createAssignment` from actions
2. Replace the direct server action call with `addAssignment` from the store
3. Remove inline error state — toast handles it
4. Keep `getAssignmentFormData` as-is (it's a read, not a mutation)

In the `handleSubmit` function, replace:

```typescript
// Old
const result = await createAssignment({ ... });
if (result.error) {
  setError(result.error);
  setSubmitting(false);
} else if (result.assignmentId) {
  router.push("/assignments");
}
```

With:

```typescript
// New
const assignmentId = await addAssignment({ ... });
if (assignmentId) {
  router.push("/assignments");
} else {
  setSubmitting(false);
}
```

Remove the `error` state and its inline display — the toast store handles error feedback now. Remove the import of `createAssignment` from actions. Add import of `useAssignmentStore` from `@/stores/assignment-store`.

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/assignments/new/page.tsx
git commit -m "migrate create assignment form to use assignment store with toast feedback"
```

---

### Task 11: Profile Store + Migrate Profile Form

**Files:**
- Create: `src/stores/profile-store.ts`
- Modify: `src/app/(student)/profile/profile-form.tsx`

- [ ] **Step 1: Create the profile store**

```typescript
// src/stores/profile-store.ts
import { create } from "zustand";

import { useToastStore } from "@/stores/toast-store";
import { updateProfile as updateProfileAction } from "@/app/(student)/profile/actions";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
}

interface ProfileStore {
  profile: ProfileData | null;
  hydrate: (profile: ProfileData) => void;
  updateProfile: (input: { firstName: string; lastName: string }) => Promise<void>;
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,

  hydrate: (profile) => set({ profile }),

  updateProfile: async (input) => {
    const { addToast } = useToastStore.getState();
    const previous = get().profile;

    // Optimistic update
    if (previous) {
      set({
        profile: {
          ...previous,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });
    }

    const result = await updateProfileAction(input);

    if (result.error) {
      // Rollback
      if (previous) {
        set({ profile: previous });
      }
      addToast({
        type: "error",
        message: result.error,
        onRetry: () => get().updateProfile(input),
      });
    } else {
      addToast({ type: "success", message: "Profile updated" });
    }
  },
}));
```

- [ ] **Step 2: Update the profile form to use the store**

Replace the contents of `src/app/(student)/profile/profile-form.tsx`:

```typescript
// src/app/(student)/profile/profile-form.tsx
"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useProfileStore } from "@/stores/profile-store";

export function ProfileForm(): React.ReactNode {
  const profile = useProfileStore((s) => s.profile);
  const hydrate = useProfileStore((s) => s.hydrate);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const userEmail = user.email ?? "";
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (profileData) {
          hydrate({
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            email: userEmail,
          });
          setFirstName(profileData.first_name);
          setLastName(profileData.last_name);
          setEmail(userEmail);
        }
      }
      setLoading(false);
    }
    load();
  }, [hydrate]);

  // Sync local form state with store (for when optimistic update rolls back)
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    await updateProfile({ firstName, lastName });
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 max-w-md rounded-xl bg-surface" />
      </div>
    );
  }

  return (
    <div className="max-w-md">
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

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/stores/profile-store.ts src/app/(student)/profile/profile-form.tsx
git commit -m "add profile store and migrate profile form to optimistic updates"
```

---

### Task 12: Class Member Store + Migrate Join Class Form

**Files:**
- Create: `src/stores/class-member-store.ts`
- Modify: `src/app/(student)/classes/join/join-class-form.tsx`

- [ ] **Step 1: Create the class member store**

```typescript
// src/stores/class-member-store.ts
import { create } from "zustand";

import { useToastStore } from "@/stores/toast-store";
import { joinClass as joinClassAction } from "@/app/(student)/classes/join/actions";

interface ClassMemberStore {
  joinClass: (joinCode: string) => Promise<string | null>;
}

export const useClassMemberStore = create<ClassMemberStore>(() => ({
  joinClass: async (joinCode) => {
    const { addToast } = useToastStore.getState();

    const result = await joinClassAction(joinCode);

    if (result.error) {
      addToast({
        type: "error",
        message: result.error,
      });
      return null;
    }

    if (result.className) {
      addToast({
        type: "success",
        message: `Joined "${result.className}"`,
      });
      return result.className;
    }

    return null;
  },
}));
```

- [ ] **Step 2: Update the join class form to use the store**

Replace the contents of `src/app/(student)/classes/join/join-class-form.tsx`:

```typescript
// src/app/(student)/classes/join/join-class-form.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClassMemberStore } from "@/stores/class-member-store";

export function JoinClassForm(): React.ReactNode {
  const joinClass = useClassMemberStore((s) => s.joinClass);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);

    const className = await joinClass(joinCode);

    if (className) {
      setJoinCode("");
    }

    setLoading(false);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Join Code"
          name="joinCode"
          placeholder="e.g. ABC123"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          autoComplete="off"
        />

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
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/stores/class-member-store.ts src/app/(student)/classes/join/join-class-form.tsx
git commit -m "add class member store and migrate join class form to toast feedback"
```

---

### Task 13: Session Store + Migrate Practice Setup

**Files:**
- Create: `src/stores/session-store.ts`
- Modify: `src/app/(student)/practice/practice-setup.tsx`

- [ ] **Step 1: Create the session store**

```typescript
// src/stores/session-store.ts
import { create } from "zustand";

import { useToastStore } from "@/stores/toast-store";
import {
  createSession as createSessionAction,
  submitAnswer as submitAnswerAction,
  completeSession as completeSessionAction,
} from "@/app/(student)/practice/actions";

interface CreateSessionInput {
  mode: "study" | "exam";
  categoryIds: string[];
  questionCount: number;
  timeLimitMinutes: number | null;
}

interface SubmitAnswerInput {
  sessionId: string;
  questionId: string;
  selectedAnswer: "a" | "b" | "c" | "d";
  timeSpentMs: number;
}

interface SessionStore {
  createSession: (input: CreateSessionInput) => Promise<string | null>;
  submitAnswer: (input: SubmitAnswerInput) => Promise<{
    isCorrect: boolean;
    correctAnswer: string;
  } | null>;
  completeSession: (sessionId: string) => Promise<{
    correctCount: number;
    totalAnswered: number;
    score: number;
  } | null>;
}

export const useSessionStore = create<SessionStore>(() => ({
  createSession: async (input) => {
    const { addToast } = useToastStore.getState();

    try {
      const sessionId = await createSessionAction(input);
      return sessionId;
    } catch {
      addToast({
        type: "error",
        message: "Failed to start practice session",
      });
      return null;
    }
  },

  submitAnswer: async (input) => {
    try {
      return await submitAnswerAction(input);
    } catch {
      const { addToast } = useToastStore.getState();
      addToast({
        type: "error",
        message: "Failed to submit answer",
      });
      return null;
    }
  },

  completeSession: async (sessionId) => {
    const { addToast } = useToastStore.getState();

    try {
      const results = await completeSessionAction(sessionId);
      addToast({ type: "success", message: "Session completed" });
      return results;
    } catch {
      addToast({
        type: "error",
        message: "Failed to complete session",
      });
      return null;
    }
  },
}));
```

- [ ] **Step 2: Update practice setup to use the store**

Replace the contents of `src/app/(student)/practice/practice-setup.tsx`:

```typescript
// src/app/(student)/practice/practice-setup.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSessionStore } from "@/stores/session-store";

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

export function PracticeSetup({ categories }: PracticeSetupProps): React.ReactNode {
  const router = useRouter();
  const createSession = useSessionStore((s) => s.createSession);
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

    const sessionId = await createSession({
      mode,
      categoryIds: selectedCategories,
      questionCount,
      timeLimitMinutes: mode === "exam" ? timeLimitMinutes : null,
    });

    if (sessionId) {
      router.push(`/practice/${sessionId}`);
    } else {
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

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/stores/session-store.ts src/app/(student)/practice/practice-setup.tsx
git commit -m "add session store and migrate practice setup to toast feedback"
```

---

### Task 14: Migrate Practice Session Page

**Files:**
- Modify: `src/app/(student)/practice/[sessionId]/page.tsx`

- [ ] **Step 1: Update the session page to use the session store**

The key changes to `src/app/(student)/practice/[sessionId]/page.tsx`:

1. Import `useSessionStore` instead of directly importing `submitAnswer` and `completeSession` from actions
2. Keep `fetchNextQuestion` as a direct import (it's a read, not a mutation)
3. Replace `submitAnswer(...)` calls with `sessionStore.submitAnswer(...)`
4. Replace `completeSession(...)` calls with `sessionStore.completeSession(...)`

In the imports, replace:

```typescript
// Old
import { fetchNextQuestion, submitAnswer, completeSession } from "../actions";
```

With:

```typescript
// New
import { fetchNextQuestion } from "../actions";
import { useSessionStore } from "@/stores/session-store";
```

Inside the component, add:

```typescript
const storeSubmitAnswer = useSessionStore((s) => s.submitAnswer);
const storeCompleteSession = useSessionStore((s) => s.completeSession);
```

Then replace all `submitAnswer(...)` calls with `storeSubmitAnswer(...)` and all `completeSession(...)` calls with `storeCompleteSession(...)`. The `storeCompleteSession` returns `null` on error instead of throwing, so update the `handleTimeUp`, `handleNext`, `handleQuit`, and `handleSubmitExam` functions to handle this:

For `handleTimeUp`:
```typescript
const handleTimeUp = useCallback(async () => {
  await storeCompleteSession(sessionId);
  router.replace(`/practice/${sessionId}/results`);
}, [sessionId, router, storeCompleteSession]);
```

For `handleSelectAnswer` (study mode submit):
```typescript
const result = await storeSubmitAnswer({
  sessionId,
  questionId: question!.id,
  selectedAnswer: answer,
  timeSpentMs,
});

setFeedback(result);
setSubmitting(false);
```

For `handleNext` (exam mode submit):
```typescript
await storeSubmitAnswer({
  sessionId,
  questionId: question.id,
  selectedAnswer,
  timeSpentMs,
});
```

For `handleNext` (completion check):
```typescript
if (!result) {
  await storeCompleteSession(sessionId);
  router.replace(`/practice/${sessionId}/results`);
  return;
}
```

For `handleQuit`:
```typescript
async function handleQuit() {
  await storeCompleteSession(sessionId);
  router.replace(`/practice/${sessionId}/results`);
}
```

For `handleSubmitExam`:
```typescript
async function handleSubmitExam() {
  if (selectedAnswer && question) {
    const timeSpentMs = Date.now() - answerStartTime;
    await storeSubmitAnswer({
      sessionId,
      questionId: question.id,
      selectedAnswer,
      timeSpentMs,
    });
  }
  await storeCompleteSession(sessionId);
  router.replace(`/practice/${sessionId}/results`);
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/(student)/practice/[sessionId]/page.tsx
git commit -m "migrate practice session page to use session store with toast feedback"
```

---

### Task 15: Remove revalidatePath from Server Actions

**Files:**
- Modify: `src/app/(teacher)/classes/actions.ts`
- Modify: `src/app/assignments/actions.ts`

- [ ] **Step 1: Remove revalidatePath from class actions**

In `src/app/(teacher)/classes/actions.ts`:

1. Remove the import: `import { revalidatePath } from "next/cache";`
2. Remove `revalidatePath("/classes");` from `createClass` (line 50)
3. Remove `revalidatePath("/classes");` from `deleteClass` (line 75)
4. Remove `revalidatePath(`/classes/${classId}`);` from `removeStudent` (line 112)

- [ ] **Step 2: Remove revalidatePath from assignment actions**

In `src/app/assignments/actions.ts`:

1. Remove the import: `import { revalidatePath } from "next/cache";`
2. Remove `revalidatePath("/assignments");` from `createAssignment` (line 80)
3. Remove `revalidatePath("/assignments");` from `deleteAssignment` (line 105)

- [ ] **Step 3: Verify build**

Run: `npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/(teacher)/classes/actions.ts src/app/assignments/actions.ts
git commit -m "remove revalidatePath calls from server actions (stores handle UI updates)"
```

---

### Task 16: Manual Verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Test teacher class flow**

1. Log in as a teacher
2. Navigate to /classes — verify the list renders
3. Click "Create Class" — create a class, verify toast appears and you're redirected
4. Navigate back to /classes — verify the new class appears

- [ ] **Step 3: Test assignment flow**

1. Navigate to /assignments — verify the list renders
2. Click "Create Assignment" — create one, verify toast appears and you're redirected
3. Navigate back to /assignments — verify the new assignment appears

- [ ] **Step 4: Test student join class flow**

1. Log in as a student
2. Navigate to /classes/join — enter a join code
3. Verify toast appears on success (or error for invalid code)

- [ ] **Step 5: Test profile update**

1. Navigate to /profile — edit name fields
2. Click Save — verify toast appears
3. Refresh the page — verify changes persisted

- [ ] **Step 6: Test practice session**

1. Navigate to /practice — set up and start a session
2. Answer questions — verify no errors
3. Complete session — verify "Session completed" toast appears

- [ ] **Step 7: Test error rollback (optional — requires network throttling)**

1. Open DevTools → Network → set to Offline
2. Try deleting a class from /classes
3. Verify: class disappears, then reappears with error toast + retry button
4. Go back online, click Retry — verify it succeeds

- [ ] **Step 8: Commit any fixes**

If any issues were found and fixed during verification, commit them:

```bash
git add -A
git commit -m "fix issues found during manual verification"
```
