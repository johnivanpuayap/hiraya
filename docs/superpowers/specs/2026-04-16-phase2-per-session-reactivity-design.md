# Phase 2: Per-Session Reactivity — Design Spec

## Goal

Make all mutations across Hiraya update the UI instantly without page reloads. After a create, edit, or delete, the user sees the change immediately. Failures roll back the UI and show an error toast with a retry option.

## Decisions

- **State management:** Zustand (one store per entity)
- **Feedback:** Toast notifications for both success and error
- **Error handling:** Optimistic rollback + error toast with inline retry button
- **Success toasts:** Auto-dismiss after ~4 seconds
- **Error toasts:** Persist until dismissed, include inline retry button
- **Toast placement:** Bottom-right, stacked

---

## Architecture

### Store-Per-Entity

Each entity gets its own Zustand store:

| Store | File | Manages |
|---|---|---|
| `useClassStore` | `src/stores/class-store.ts` | Classes list, create/delete class, remove student |
| `useAssignmentStore` | `src/stores/assignment-store.ts` | Assignments list, create/delete assignment |
| `useClassMemberStore` | `src/stores/class-member-store.ts` | Join class (student side) |
| `useProfileStore` | `src/stores/profile-store.ts` | Profile updates (first name, last name) |
| `useSessionStore` | `src/stores/session-store.ts` | Practice session state (create, submit answer, complete) |
| `useToastStore` | `src/stores/toast-store.ts` | Toast queue (success/error with optional retry) |

### Store Shape (common pattern)

Each entity store follows this shape:

```typescript
interface EntityStore {
  items: Entity[];
  hydrate: (items: Entity[]) => void;
  // mutation actions that do optimistic update + server call
  createEntity: (input: CreateInput) => Promise<void>;
  deleteEntity: (id: string) => Promise<void>;
  // etc.
}
```

### Toast Store Shape

```typescript
interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
  onRetry?: () => void; // present only on error toasts
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}
```

---

## Optimistic Update Flow

All mutations follow this flow:

```
User action (e.g., click delete)
  → Store updates state immediately (item removed from list)
  → Success toast shown ("Class deleted")
  → Server action called in background
  → If server succeeds: done
  → If server fails:
      → Store rolls back state (item reappears)
      → Success toast dismissed
      → Error toast with retry button ("Failed to delete class")
      → Clicking retry repeats the entire flow
```

### Shared Utility

`src/lib/optimistic-update.ts` provides a reusable function:

```typescript
performOptimisticUpdate({
  optimisticFn,   // updates store state immediately
  serverFn,       // calls the server action
  rollbackFn,     // reverts store state on failure
  successMessage, // "Class deleted"
  errorMessage,   // "Failed to delete class"
  onRetry,        // re-runs the whole flow
})
```

Each store action calls this with entity-specific logic. The utility handles the sequencing, toast dispatching, and rollback coordination.

---

## Hydration Pattern

Server components still fetch data. A thin client component seeds the store on mount.

```
Server Component (fetches data from Supabase)
  → passes data as props to <StoreHydrator />
    → calls store.hydrate(data) on mount
      → Client components read from the Zustand store
        → Mutations update the store directly
```

### StoreHydrator Convention

Each page that needs reactivity gets a hydrator component:

```typescript
"use client";

import { useClassStore } from "@/stores/class-store";
import { useRef } from "react";

export function ClassStoreHydrator({ classes }: { classes: Class[] }) {
  const hydrated = useRef(false);
  if (!hydrated.current) {
    useClassStore.getState().hydrate(classes);
    hydrated.current = true;
  }
  return null;
}
```

This ensures hydration happens once and synchronously before children render.

---

## Toast Component

### `<Toaster />` — rendered once in root layout

- Reads from `useToastStore`
- Positioned fixed bottom-right
- Toasts stack vertically with gap
- Slide-in animation on appear, fade-out on dismiss

### Toast Styling (Golden Study Nook palette)

**Both success and error:**
- Background: `rgba(255, 250, 240, 0.75)` with `backdrop-filter: blur(12px)` (frosted glass)
- Border radius: `16px`
- Shadow: `0 4px 16px rgba(42, 29, 14, 0.08)`
- Text: `#2A1D0E` (deep espresso), Inter font, 14px
- Icon: circle with colored background, centered symbol

**Success toast:**
- Border: `1px solid rgba(199, 123, 26, 0.15)` (glass border)
- Icon bg: `rgba(90, 142, 76, 0.15)`, icon color: `#5A8E4C`
- Auto-dismisses after 4 seconds

**Error toast:**
- Border: `1px solid rgba(191, 74, 45, 0.2)`
- Icon bg: `rgba(191, 74, 45, 0.12)`, icon color: `#BF4A2D`
- Persists until manually dismissed
- Inline retry button: `rgba(191, 74, 45, 0.08)` bg, `rgba(191, 74, 45, 0.2)` border, `#BF4A2D` text, 8px radius

### Toast Layout (Option A — Inline Retry)

```
┌─ [✓ icon] ── Message text ──────────────────┐  ← success
└─────────────────────────────────────────────-┘

┌─ [✕ icon] ── Message text ──────── [Retry] ─┐  ← error
└──────────────────────────────────────────────┘
```

---

## Migration: What Changes Per Page

### What stays the same
- Server actions still exist and perform actual Supabase mutations
- Server components still fetch initial data
- Auth, middleware, RLS — untouched

### What changes

| Page | Current | After |
|---|---|---|
| Teacher classes list | Server fetch → static render | Server fetch → hydrate store → reactive list |
| Teacher class detail | Server fetch → static render | Hydrate store → reactive student list |
| Create class form | `router.push("/classes")` on success | Store adds class → toast → close/redirect |
| Assignments list | Server fetch → static render | Server fetch → hydrate store → reactive list |
| Create assignment | `router.push("/assignments")` on success | Store adds assignment → toast → redirect |
| Join class (student) | Inline success/error text | Store adds membership → toast |
| Profile form | Inline success text | Store updates profile → toast |
| Practice session | Complex local state | Store manages session state → toast on submit |

### What's new

| File | Purpose |
|---|---|
| `src/stores/class-store.ts` | Zustand store for classes |
| `src/stores/assignment-store.ts` | Zustand store for assignments |
| `src/stores/class-member-store.ts` | Zustand store for class membership |
| `src/stores/profile-store.ts` | Zustand store for profile |
| `src/stores/session-store.ts` | Zustand store for practice sessions |
| `src/stores/toast-store.ts` | Zustand store for toast queue |
| `src/lib/optimistic-update.ts` | Shared optimistic mutation utility |
| `src/components/ui/toaster.tsx` | Toast renderer component |

### Server action changes
- Remove `revalidatePath()` calls from all server actions (store handles UI updates)
- Return types unchanged — stores use the same `{ data?, error? }` response

---

## Dependencies

- `zustand` — only new dependency needed
- No toast library — custom built to match design system
- No animation library — CSS transitions only (per design.md)
