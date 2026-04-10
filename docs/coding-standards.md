# Hiraya — Coding Standards

## TypeScript

### Strict Mode
- `strict: true` in tsconfig — no exceptions
- Never use `any` — use `unknown` and narrow with type guards
- Never use `as` type assertions unless interfacing with untyped third-party code (document why)
- All function parameters and return types must be explicitly typed
- All component props defined with `interface` (not `type` alias)

### Enums and Constants
- Use `const` objects with `as const` over TypeScript enums
- Group related constants in a single file under `lib/constants/`

```typescript
// Good
const ROLES = { STUDENT: "student", TEACHER: "teacher" } as const;
type Role = (typeof ROLES)[keyof typeof ROLES];

// Bad
enum Role { Student = "student", Teacher = "teacher" }
```

## File Naming & Organization

### Naming Conventions
- **Files and folders:** `kebab-case` (e.g., `question-card.tsx`, `spaced-repetition.ts`)
- **Component exports:** `PascalCase` (e.g., `export function QuestionCard()`)
- **Hooks:** `camelCase` prefixed with `use` (e.g., `use-quiz-timer.ts` → `export function useQuizTimer()`)
- **Utilities and lib:** `camelCase` for functions (e.g., `calculateTheta`)
- **Types:** `PascalCase` for interfaces and type aliases (e.g., `interface QuestionCardProps`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_QUESTIONS_PER_SESSION`)

### File Structure
Each component file follows this order:

```typescript
// 1. Imports — grouped and ordered
import { /* external packages */ } from "next/...";      // framework
import { /* external packages */ } from "react";          // libraries
import { /* internal modules */ } from "@/lib/...";       // lib/utils
import { /* internal modules */ } from "@/components/..."; // components
import { /* types */ } from "@/types/...";                 // types

// 2. Types and interfaces
interface ComponentProps {
  // ...
}

// 3. Constants (local to this file)
const MAX_RETRIES = 3;

// 4. Component or function (exported)
export function Component({ prop }: ComponentProps) {
  // ...
}

// 5. Helper functions (private to this file, not exported)
function helperFunction() {
  // ...
}
```

### Import Ordering
Imports are grouped in this order, with a blank line between groups:

1. Framework imports (`next/*`, `react`)
2. Third-party libraries (`@supabase/*`, etc.)
3. Internal lib/utils (`@/lib/*`)
4. Internal components (`@/components/*`)
5. Types (`@/types/*`)
6. Styles (if any CSS modules)

## Components

### Server vs Client
- **Server Components by default** — every component is a Server Component unless it needs:
  - Event handlers (`onClick`, `onChange`, etc.)
  - Browser APIs (`window`, `localStorage`, etc.)
  - React hooks (`useState`, `useEffect`, `useReducer`, etc.)
- Add `"use client"` directive only to the smallest component that needs it — push client boundaries down, not up

### Props
- Define props with `interface`, not `type`
- Destructure props in the function signature
- Required props first, optional props after

```typescript
// Good
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "flat";
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  // ...
}
```

### Access Modifier Ordering (within a component)
Follow this order inside component bodies:

1. Refs (`useRef`)
2. State (`useState`, `useReducer`)
3. Derived/computed values
4. Effects (`useEffect`)
5. Event handlers
6. Render helpers (small inline functions for JSX)
7. Return JSX

```typescript
"use client";

export function QuizSession({ sessionId }: QuizSessionProps) {
  // 1. Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());

  // 3. Derived values
  const currentQuestion = questions[currentIndex];
  const progress = (currentIndex + 1) / questions.length;

  // 4. Effects
  useEffect(() => {
    // timer logic
  }, []);

  // 5. Event handlers
  function handleAnswer(questionId: string, answer: string) {
    // ...
  }

  function handleNext() {
    // ...
  }

  // 6. Return JSX
  return <div>...</div>;
}
```

## Logging

### When to Log
Log important operations that aid debugging and monitoring:

- **Auth events** — login, logout, registration, role detection
- **Session lifecycle** — practice/exam session started, completed, score recorded
- **Adaptive engine** — question selected (with reason: IRT/spaced-rep/category), theta updated, readiness score calculated
- **Errors** — all caught errors with context (what was attempted, what failed)
- **Teacher actions** — class created, assignment published, student added

### How to Log
Use `console` methods with structured prefixes:

```typescript
// Info — normal operations
console.info("[auth] user registered", { userId, role });
console.info("[adaptive] question selected", { questionId, reason: "irt", theta: 0.45 });
console.info("[session] exam completed", { sessionId, score: 85, totalQuestions: 30 });

// Warn — unexpected but recoverable
console.warn("[adaptive] no questions available for category", { category, studentId });

// Error — failures
console.error("[auth] login failed", { email, error: err.message });
```

### What NOT to Log
- Passwords, tokens, or secrets
- Full request/response bodies (log IDs and status instead)
- Verbose per-render logs in components

## Styling

### Tailwind CSS
- Use Tailwind utility classes — no custom CSS files unless absolutely necessary
- Use the Golden Hour design tokens defined in `tailwind.config.ts`
- Prefer semantic color names (`text-primary`, `bg-surface`) over raw hex values
- Responsive design: mobile-first, use `sm:`, `md:`, `lg:` breakpoints

## Error Handling

- Use error boundaries (`error.tsx`) at route group level for graceful fallbacks
- Use `loading.tsx` at page level for loading states
- Validate at system boundaries only — user input, Supabase responses
- Let TypeScript's type system prevent internal errors rather than defensive coding

## Git

- **Atomic commits** — one logical change per commit
- **No co-author tags** — never append "Co-Authored-By" to commit messages
- **Commit messages** — imperative mood, lowercase, concise
  - `add user registration flow`
  - `fix theta calculation for edge case`
  - `refactor question selection into separate module`
- **Branch naming** — `feature/topic`, `hotfix/topic`, `chore/topic`
