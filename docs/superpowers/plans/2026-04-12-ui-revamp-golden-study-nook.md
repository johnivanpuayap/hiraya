# UI Revamp — Golden Study Nook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revamp Hiraya's entire UI from generic to the "Golden Study Nook" aesthetic — frosted glass surfaces, refined warm palette, DM Serif Display typography, atmospheric effects, subtle motion.

**Architecture:** Update the design system tokens first (globals.css, root layout), then update shared components (Button, Card, Input, Select, Toast, NavLink, Sidebar, Header), then update all page-level files. Each task is self-contained and testable.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 (@theme), DM Serif Display + Inter (Google Fonts), CSS transitions only (no animation libs)

**Spec:** `docs/superpowers/specs/2026-04-12-ui-revamp-golden-study-nook.md`

**Preview:** `docs/crucible/approach-b-golden-study-nook.html`

---

## File Map

**Modify:**
- `src/app/globals.css` — color tokens, shadows, new glass/atmospheric utilities
- `src/app/layout.tsx` — swap Outfit → DM Serif Display, update body classes
- `src/components/ui/button.tsx` — golden gradient primary, warm ghost
- `src/components/ui/card.tsx` — frosted glass surface, 16px radius, hover lift
- `src/components/ui/input.tsx` — warm border, golden focus ring
- `src/components/ui/select.tsx` — warm border, golden focus ring
- `src/components/ui/toast.tsx` — warm styling
- `src/components/layout/sidebar.tsx` — frosted glass, warm styling
- `src/components/layout/header.tsx` — warm tones, golden avatar
- `src/components/layout/nav-link.tsx` — golden active state, left accent bar
- `src/app/(auth)/layout.tsx` — atmospheric background, centered glass card
- `src/app/(auth)/login/page.tsx` — DM Serif heading, warm form styling
- `src/app/(auth)/register/page.tsx` — DM Serif heading, warm form styling
- `src/app/(student)/layout.tsx` — atmospheric background classes
- `src/app/(teacher)/layout.tsx` — atmospheric background classes
- `src/app/dashboard/layout.tsx` — atmospheric background classes
- `src/app/assignments/layout.tsx` — atmospheric background classes
- `src/app/dashboard/page.tsx` — DM Serif headings, warm stat styling
- `src/components/dashboard/stat-card.tsx` — frosted glass, hover top bar
- `src/components/dashboard/mastery-chart.tsx` — golden gradient bars
- `src/components/dashboard/readiness-gauge.tsx` — warm palette SVG
- `src/components/dashboard/streak-display.tsx` — DM Serif number, warm accents
- `src/components/dashboard/weak-topics.tsx` — warm card styling
- `src/components/dashboard/trend-graph.tsx` — warm palette SVG
- `src/components/quiz/question-card.tsx` — DM Serif question, option hover slides
- `src/components/quiz/timer.tsx` — warm colors
- `src/components/quiz/progress-bar.tsx` — golden gradient fill
- `src/components/quiz/answer-feedback.tsx` — refined success/danger colors
- `src/components/quiz/quiz-nav.tsx` — warm button styling
- `src/app/(student)/practice/page.tsx` — warm card styling
- `src/app/(student)/practice/[sessionId]/page.tsx` — quiz UI warm treatment
- `src/app/(student)/practice/[sessionId]/results/page.tsx` — DM Serif score, warm bars
- `src/app/(student)/profile/page.tsx` — warm form styling
- `src/app/(student)/classes/join/page.tsx` — warm form styling
- `src/app/assignments/page.tsx` — warm card/table styling
- `src/app/assignments/new/page.tsx` — warm form styling

---

### Task 1: Update Design System Tokens (globals.css)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace the @theme block with Golden Study Nook tokens**

Replace the entire contents of `src/app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  /* Golden Study Nook palette */
  --color-primary: #C77B1A;
  --color-primary-light: #E6A040;
  --color-secondary: #B85A3B;
  --color-background: #FBF4E9;
  --color-background-end: #F2E5CF;
  --color-surface: #FFFAF0;
  --color-accent: #C77B1A;
  --color-success: #5A8E4C;
  --color-danger: #BF4A2D;
  --color-text-primary: #2A1D0E;
  --color-text-secondary: #6B5640;
  --color-text-muted: #9C876E;

  --font-heading: var(--font-dm-serif-display), serif;
  --font-body: var(--font-inter), sans-serif;

  --shadow-warm: 0 2px 12px rgba(42, 29, 14, 0.05);
  --shadow-warm-lg: 0 8px 32px rgba(42, 29, 14, 0.1);
}

/* Atmospheric background with ambient light orbs */
.bg-atmosphere {
  background: linear-gradient(160deg, #FBF4E9 0%, #F6EDD8 50%, #F2E5CF 100%);
  position: relative;
}

.bg-atmosphere::before {
  content: '';
  position: fixed;
  top: -20%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(230, 160, 64, 0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.bg-atmosphere::after {
  content: '';
  position: fixed;
  bottom: -10%;
  left: -5%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(184, 90, 59, 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* Frosted glass surface */
.glass {
  background: rgba(255, 250, 240, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(199, 123, 26, 0.15);
}

/* Glass border utility */
.border-glass {
  border-color: rgba(199, 123, 26, 0.15);
}

/* Primary gradient for buttons */
.bg-primary-gradient {
  background: linear-gradient(135deg, #C77B1A, #E6A040);
}

/* Golden focus ring */
.focus-golden:focus {
  border-color: #C77B1A;
  box-shadow: 0 0 0 3px rgba(199, 123, 26, 0.15);
  outline: none;
}
```

- [ ] **Step 2: Verify the dev server still compiles**

Run: `npm run dev` (check for build errors in terminal)
Expected: No CSS compilation errors

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "update design tokens to Golden Study Nook palette"
```

---

### Task 2: Update Root Layout (Fonts + Body)

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace root layout with DM Serif Display + atmospheric body**

Replace the entire contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif-display",
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: "Hiraya — Your friendly adaptive PhilNITS reviewer",
  description:
    "Your friendly adaptive PhilNITS reviewer that tracks your progress and helps you prepare with confidence.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="bg-atmosphere font-body text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify the dev server loads with the new font**

Run: `npm run dev`, open browser, check that the background gradient is visible and DM Serif Display loads.
Expected: Warm gradient background, no broken fonts.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "switch heading font to DM Serif Display, add atmospheric background"
```

---

### Task 3: Update Shared UI Components

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/select.tsx`
- Modify: `src/components/ui/toast.tsx`

- [ ] **Step 1: Update Button — golden gradient primary, warm ghost**

Replace the entire contents of `src/components/ui/button.tsx` with:

```tsx
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary-gradient text-white shadow-[0_4px_16px_rgba(199,123,26,0.35)] hover:shadow-[0_6px_24px_rgba(199,123,26,0.45)] hover:-translate-y-0.5",
  secondary:
    "border-2 border-glass text-accent hover:bg-[rgba(199,123,26,0.15)]",
  danger:
    "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger",
  ghost:
    "text-text-secondary border border-glass hover:bg-[rgba(199,123,26,0.15)] hover:border-transparent",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-xl font-heading font-semibold transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
```

- [ ] **Step 2: Update Card — frosted glass, hover lift**

Replace the entire contents of `src/components/ui/card.tsx` with:

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  padding = "md",
  hover = false,
  className = "",
  children,
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={`rounded-2xl glass shadow-warm transition-all duration-300 ease-out ${
        hover
          ? "hover:shadow-warm-lg hover:-translate-y-0.5"
          : ""
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Update Input — warm border, golden focus**

Replace the entire contents of `src/components/ui/input.tsx` with:

```tsx
import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, id, className = "", ...props }, ref) {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`rounded-xl border border-glass bg-surface px-4 py-2.5 text-text-primary placeholder:text-text-muted transition-all duration-200 focus-golden ${
            error ? "border-danger" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
);
```

- [ ] **Step 4: Update Select — warm border, golden focus**

Replace the entire contents of `src/components/ui/select.tsx` with:

```tsx
import { forwardRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, options, id, className = "", ...props }, ref) {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`rounded-xl border border-glass bg-surface px-4 py-2.5 text-text-primary transition-all duration-200 focus-golden ${
            error ? "border-danger" : ""
          } ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }
);
```

- [ ] **Step 5: Update Toast — warm golden styling**

Replace the entire contents of `src/components/ui/toast.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

const typeStyles: Record<NonNullable<ToastProps["type"]>, string> = {
  success: "border-success bg-success/10 text-success",
  error: "border-danger bg-danger/10 text-danger",
  info: "border-primary bg-primary/10 text-text-primary",
};

export function Toast({
  message,
  type = "info",
  duration = 4000,
  onClose,
}: ToastProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-xl border glass px-4 py-3 shadow-warm-lg ${typeStyles[type]}`}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
```

- [ ] **Step 6: Verify all components render**

Run: `npm run dev`, check that buttons, cards, inputs render correctly with new styles.
Expected: Golden gradient buttons, frosted glass cards, warm input borders.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/input.tsx src/components/ui/select.tsx src/components/ui/toast.tsx
git commit -m "update UI components to Golden Study Nook style"
```

---

### Task 4: Update Layout Components (Sidebar, Header, NavLink)

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/nav-link.tsx`

- [ ] **Step 1: Update Sidebar — frosted glass**

Replace the entire contents of `src/components/layout/sidebar.tsx` with:

```tsx
import { NavLink } from "@/components/layout/nav-link";
import { Logo } from "@/components/ui/logo";

interface SidebarProps {
  role: "student" | "teacher";
  hasClasses?: boolean;
}

const studentBaseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/practice", label: "Practice", icon: "📝" },
  { href: "/assignments", label: "Assignments", icon: "📋" },
  { href: "/classes/join", label: "Join Class", icon: "🏫" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/classes", label: "Classes", icon: "🏫" },
  { href: "/assignments", label: "Assignments", icon: "📋" },
  { href: "/questions", label: "Question Bank", icon: "📚" },
];

export function Sidebar({ role, hasClasses = true }: SidebarProps): React.JSX.Element {
  const links =
    role === "teacher"
      ? teacherLinks
      : studentBaseLinks.filter(
          (link) => link.href !== "/assignments" || hasClasses
        );

  return (
    <aside className="flex h-screen w-[270px] flex-col glass">
      <div className="px-6 py-6">
        <Logo size="md" />
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-4 py-2">
        {links.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={<span>{link.icon}</span>}
          />
        ))}
      </nav>

      <div className="border-t border-glass px-6 py-4" />
    </aside>
  );
}
```

- [ ] **Step 2: Update Header — warm tones, golden avatar**

Replace the entire contents of `src/components/layout/header.tsx` with:

```tsx
import Image from "next/image";

import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  displayName: string;
  avatarUrl: string | null;
}

export function Header({ displayName, avatarUrl }: HeaderProps): React.JSX.Element {
  return (
    <header className="flex h-16 items-center justify-between border-b border-glass bg-surface/50 backdrop-blur-sm px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-text-primary">
          {displayName}
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-gradient text-sm font-bold text-white shadow-[0_2px_10px_rgba(199,123,26,0.25)]">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Update NavLink — golden active state, left accent bar**

Replace the entire contents of `src/components/layout/nav-link.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function NavLink({ href, icon, label }: NavLinkProps): React.JSX.Element {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-250 ${
        isActive
          ? "bg-[rgba(199,123,26,0.15)] text-primary font-semibold"
          : "text-text-secondary hover:bg-[rgba(199,123,26,0.08)] hover:text-text-primary"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
      )}
      <span className="h-5 w-5">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
```

- [ ] **Step 4: Verify sidebar and header render**

Run: `npm run dev`, navigate to `/dashboard`. Check sidebar has frosted glass, active link has left bar, header has golden avatar.
Expected: Matches the preview mockup.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/header.tsx src/components/layout/nav-link.tsx
git commit -m "update layout components to frosted glass Golden Study Nook style"
```

---

### Task 5: Update Layout Files (Auth, Student, Teacher, Dashboard, Assignments)

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(student)/layout.tsx`
- Modify: `src/app/(teacher)/layout.tsx`
- Modify: `src/app/dashboard/layout.tsx`
- Modify: `src/app/assignments/layout.tsx`

- [ ] **Step 1: Update Auth layout — atmospheric centered glass card**

In `src/app/(auth)/layout.tsx`, replace the return JSX. The current layout centers content — update it to use the glass treatment:

Find:
```tsx
<div className="flex min-h-screen items-center justify-center bg-background px-4">
```
Replace with:
```tsx
<div className="flex min-h-screen items-center justify-center px-4">
```

Find any `bg-surface` or `bg-background` card wrapper and replace with `glass` class. Find any `shadow-warm` on the auth card and keep it — the glass utility already includes the border.

- [ ] **Step 2: Update Student layout — add relative z-index for atmosphere**

In `src/app/(student)/layout.tsx`, find the main content wrapper div and ensure it has `relative z-[1]` so content sits above the atmospheric pseudo-elements:

Find:
```tsx
<main className="flex-1 overflow-y-auto">
```
Replace with:
```tsx
<main className="relative z-[1] flex-1 overflow-y-auto">
```

- [ ] **Step 3: Apply the same z-index fix to Teacher, Dashboard, and Assignments layouts**

In each of these files, find the `<main>` wrapper and add `relative z-[1]`:
- `src/app/(teacher)/layout.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/assignments/layout.tsx`

Find:
```tsx
<main className="flex-1 overflow-y-auto">
```
Replace with:
```tsx
<main className="relative z-[1] flex-1 overflow-y-auto">
```

- [ ] **Step 4: Verify layouts render**

Run: `npm run dev`, check `/login`, `/dashboard` (both roles). Background gradient and orbs should be visible behind all pages.
Expected: Atmospheric background on every page, content above orbs.

- [ ] **Step 5: Commit**

```bash
git add src/app/(auth)/layout.tsx src/app/(student)/layout.tsx src/app/(teacher)/layout.tsx src/app/dashboard/layout.tsx src/app/assignments/layout.tsx
git commit -m "update layouts with atmospheric background and z-index layering"
```

---

### Task 6: Update Auth Pages (Login + Register)

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Update Login page**

In `src/app/(auth)/login/page.tsx`:

Find the main heading (likely `<h1>` or `<h2>` with "Log in" or "Welcome"):
- Change class to include `font-heading text-3xl` for DM Serif Display treatment

Find the form card wrapper:
- Replace `bg-surface rounded-xl shadow-warm` (or similar) with `glass rounded-2xl shadow-warm`

Find any `border-surface` or `border-2 border-surface`:
- Replace with `border-glass`

- [ ] **Step 2: Update Register page**

In `src/app/(auth)/register/page.tsx`:

Apply the same changes as login:
- DM Serif heading: `font-heading text-3xl`
- Form card: `glass rounded-2xl shadow-warm`
- Borders: `border-glass`

For the email confirmation success card, also apply `glass rounded-2xl`.

- [ ] **Step 3: Verify auth pages**

Run: `npm run dev`, check `/login` and `/register`.
Expected: Frosted glass form cards, DM Serif headings, warm atmospheric background.

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/register/page.tsx
git commit -m "update auth pages with frosted glass cards and DM Serif headings"
```

---

### Task 7: Update Dashboard Components

**Files:**
- Modify: `src/components/dashboard/stat-card.tsx`
- Modify: `src/components/dashboard/mastery-chart.tsx`
- Modify: `src/components/dashboard/readiness-gauge.tsx`
- Modify: `src/components/dashboard/streak-display.tsx`
- Modify: `src/components/dashboard/weak-topics.tsx`
- Modify: `src/components/dashboard/trend-graph.tsx`

- [ ] **Step 1: Update StatCard — frosted glass, hover top bar**

Replace the entire contents of `src/components/dashboard/stat-card.tsx` with:

```tsx
interface StatCardProps {
  label: string;
  value: string | number;
  subText?: string;
}

export function StatCard({ label, value, subText }: StatCardProps): React.JSX.Element {
  return (
    <div className="group relative glass rounded-2xl p-5 shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl text-text-primary">
        {value}
      </p>
      {subText && (
        <p className="mt-1 text-xs font-medium text-success">{subText}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update MasteryChart — golden gradient bars**

In `src/components/dashboard/mastery-chart.tsx`:

Find the progress bar div (the inner fill bar) and update its background:
- Replace `bg-primary` or `bg-accent` with `bg-primary-gradient`
- For low mastery (<50%), use `bg-secondary` instead
- Ensure the outer bar background is `bg-[rgba(156,135,110,0.12)]` instead of `bg-surface` or `bg-background`

Find the heading:
- Add `font-heading` class

- [ ] **Step 3: Update ReadinessGauge — warm palette SVG**

In `src/components/dashboard/readiness-gauge.tsx`:

Update the SVG colors:
- Good (70+): change from `#4CAF50` to `#5A8E4C`
- Moderate (40-69): change from any orange to `#C77B1A`
- Low (<40): change from any red to `#BF4A2D`

Find the percentage text:
- Add `font-heading` to the text element class or style

- [ ] **Step 4: Update StreakDisplay — DM Serif number**

In `src/components/dashboard/streak-display.tsx`:

Find the streak number display:
- Add `font-heading text-5xl text-primary` classes
- Remove any existing font-size/weight classes that conflict

Find the "day(s)" label:
- Use `text-sm text-text-muted font-medium`

- [ ] **Step 5: Update WeakTopics — warm card styling**

In `src/components/dashboard/weak-topics.tsx`:

Find each topic card/link:
- Replace `bg-surface` or `bg-background` with `glass`
- Add `rounded-xl transition-all duration-250 hover:shadow-warm` 
- Update any `border-surface` to `border-glass`

Find the mastery percentage bar:
- Use `bg-secondary` for the fill (these are weak topics)
- Outer bar: `bg-[rgba(156,135,110,0.12)]`

- [ ] **Step 6: Update TrendGraph — warm palette SVG**

In `src/components/dashboard/trend-graph.tsx`:

Update SVG colors:
- Line stroke: change to `#C77B1A`
- Data points fill: change to `#C77B1A`
- Grid lines: change to `rgba(139, 94, 60, 0.1)`
- Area fill (if any): change to `rgba(199, 123, 26, 0.1)`

- [ ] **Step 7: Verify dashboard**

Run: `npm run dev`, navigate to `/dashboard` as a student.
Expected: Frosted glass stat cards with hover top bar, golden mastery bars, warm readiness gauge, DM Serif streak number, warm trend graph.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/stat-card.tsx src/components/dashboard/mastery-chart.tsx src/components/dashboard/readiness-gauge.tsx src/components/dashboard/streak-display.tsx src/components/dashboard/weak-topics.tsx src/components/dashboard/trend-graph.tsx
git commit -m "update dashboard components to Golden Study Nook style"
```

---

### Task 8: Update Dashboard Page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard page headings and layout**

In `src/app/dashboard/page.tsx`:

Find the main greeting heading (e.g. "Welcome back" or similar `<h1>`):
- Add `font-heading text-3xl` class

Find any section headings (`<h2>`, `<h3>`):
- Add `font-heading` class

Find any `bg-surface` card wrappers:
- Replace with `glass rounded-2xl`

Find any `border-surface`:
- Replace with `border-glass`

Find the stats grid:
- Ensure it uses the updated `StatCard` component (no inline stat styling)

- [ ] **Step 2: Verify both student and teacher dashboards**

Run: `npm run dev`, check `/dashboard` as student and teacher.
Expected: DM Serif headings, warm cards, golden stat styling.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "update dashboard page with DM Serif headings and warm styling"
```

---

### Task 9: Update Quiz Components

**Files:**
- Modify: `src/components/quiz/question-card.tsx`
- Modify: `src/components/quiz/timer.tsx`
- Modify: `src/components/quiz/progress-bar.tsx`
- Modify: `src/components/quiz/answer-feedback.tsx`
- Modify: `src/components/quiz/quiz-nav.tsx`

- [ ] **Step 1: Update QuestionCard — DM Serif question, option hover slides**

In `src/components/quiz/question-card.tsx`:

Find the question text element:
- Add `font-heading text-xl` class

Find each answer option wrapper:
- Replace border classes with `border border-glass rounded-xl`
- Add `transition-all duration-250 hover:translate-x-1 hover:border-primary hover:bg-[rgba(199,123,26,0.08)]`
- For selected state: `border-primary bg-[rgba(199,123,26,0.15)] shadow-[0_2px_12px_rgba(199,123,26,0.1)]`

Find the option letter circle (A, B, C, D):
- Default: `bg-[rgba(156,135,110,0.1)] rounded-full`
- Selected: `bg-primary-gradient text-white shadow-[0_2px_8px_rgba(199,123,26,0.3)]`

Find the question number/category label:
- Use `text-xs font-semibold uppercase tracking-wide text-primary`

- [ ] **Step 2: Update Timer — warm colors**

In `src/components/quiz/timer.tsx`:

Find the timer bar:
- Normal state: `bg-primary-gradient`
- Urgent state (<20%): `bg-danger`
- Bar background: `bg-[rgba(156,135,110,0.12)]`

Find the timer text:
- Use `text-text-secondary font-medium`

- [ ] **Step 3: Update ProgressBar — golden gradient fill**

In `src/components/quiz/progress-bar.tsx`:

Find the progress fill bar:
- Replace `bg-primary` or `bg-accent` with `bg-primary-gradient`
- Add `shadow-[0_0_8px_rgba(199,123,26,0.3)]`
- Bar background: `bg-[rgba(156,135,110,0.12)]`

Find the label text:
- Use `text-sm text-text-muted font-medium`

- [ ] **Step 4: Update AnswerFeedback — refined colors**

In `src/components/quiz/answer-feedback.tsx`:

Find correct answer styling:
- Use `border-success bg-success/10 text-success`

Find incorrect answer styling:
- Use `border-danger bg-danger/10 text-danger`

Wrap in `rounded-xl` if not already.

- [ ] **Step 5: Update QuizNav — warm button styling**

In `src/components/quiz/quiz-nav.tsx`:

Buttons here should use the `Button` component — if they're already using it, they'll inherit the new styling automatically. If they use inline classes, update to match the Button component patterns.

- [ ] **Step 6: Verify quiz flow**

Run: `npm run dev`, start a practice session. Check question card, options, progress bar, timer.
Expected: DM Serif question text, options slide on hover, golden progress bar.

- [ ] **Step 7: Commit**

```bash
git add src/components/quiz/question-card.tsx src/components/quiz/timer.tsx src/components/quiz/progress-bar.tsx src/components/quiz/answer-feedback.tsx src/components/quiz/quiz-nav.tsx
git commit -m "update quiz components to Golden Study Nook style"
```

---

### Task 10: Update Practice Pages

**Files:**
- Modify: `src/app/(student)/practice/page.tsx`
- Modify: `src/app/(student)/practice/[sessionId]/page.tsx`
- Modify: `src/app/(student)/practice/[sessionId]/results/page.tsx`

- [ ] **Step 1: Update Practice setup page**

In `src/app/(student)/practice/page.tsx`:

Find the page heading:
- Add `font-heading text-3xl`

Find any card wrappers:
- Replace `bg-surface rounded-xl` with `glass rounded-2xl`

- [ ] **Step 2: Update Practice session page**

In `src/app/(student)/practice/[sessionId]/page.tsx`:

Find the quiz wrapper/card:
- Replace `bg-surface` or similar with `glass rounded-2xl shadow-warm`
- Add `relative` for the decorative corner glow

Add decorative corner accent (after the opening div of the quiz card):
```tsx
<div className="absolute top-0 right-0 w-20 h-20 bg-[radial-gradient(circle_at_top_right,rgba(199,123,26,0.15)_0%,transparent_60%)] rounded-tr-2xl pointer-events-none" />
```

Find any `bg-background` or `bg-surface` on the page:
- Replace with appropriate warm classes

- [ ] **Step 3: Update Results page**

In `src/app/(student)/practice/[sessionId]/results/page.tsx`:

Find the score display:
- Add `font-heading text-5xl text-primary`

Find the page heading ("Results" or similar):
- Add `font-heading text-3xl`

Find category breakdown bars:
- Use `bg-primary-gradient` for fill, `bg-[rgba(156,135,110,0.12)]` for background

Find any card wrappers:
- Replace with `glass rounded-2xl`

- [ ] **Step 4: Verify practice flow end-to-end**

Run: `npm run dev`, go through practice setup → quiz → results.
Expected: All pages have warm atmospheric styling, quiz card has corner glow, results show DM Serif score.

- [ ] **Step 5: Commit**

```bash
git add src/app/(student)/practice/page.tsx "src/app/(student)/practice/[sessionId]/page.tsx" "src/app/(student)/practice/[sessionId]/results/page.tsx"
git commit -m "update practice pages to Golden Study Nook style"
```

---

### Task 11: Update Remaining Student Pages (Profile, Join Class)

**Files:**
- Modify: `src/app/(student)/profile/page.tsx`
- Modify: `src/app/(student)/classes/join/page.tsx`

- [ ] **Step 1: Update Profile page**

In `src/app/(student)/profile/page.tsx`:

Find the page heading:
- Add `font-heading text-3xl`

Find the form card wrapper:
- Replace with `glass rounded-2xl`

Input and Select components will already have warm styling from Task 3.

- [ ] **Step 2: Update Join Class page**

In `src/app/(student)/classes/join/page.tsx`:

Find the page heading:
- Add `font-heading text-3xl`

Find the form card wrapper:
- Replace with `glass rounded-2xl`

- [ ] **Step 3: Verify**

Run: `npm run dev`, check `/profile` and `/classes/join`.
Expected: Frosted glass forms, DM Serif headings.

- [ ] **Step 4: Commit**

```bash
git add src/app/(student)/profile/page.tsx src/app/(student)/classes/join/page.tsx
git commit -m "update student profile and join class pages to warm styling"
```

---

### Task 12: Update Assignment Pages

**Files:**
- Modify: `src/app/assignments/page.tsx`
- Modify: `src/app/assignments/new/page.tsx`

- [ ] **Step 1: Update Assignments list page**

In `src/app/assignments/page.tsx`:

Find the page heading:
- Add `font-heading text-3xl`

Find assignment cards/list items:
- Replace `bg-surface rounded-xl` with `glass rounded-2xl`
- Add `transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5`

Find any table/list borders:
- Replace with `border-glass`

Find status badges:
- Use warm variants of colors

- [ ] **Step 2: Update New Assignment page**

In `src/app/assignments/new/page.tsx`:

Find the page heading:
- Add `font-heading text-3xl`

Find the form card:
- Replace with `glass rounded-2xl`

Input, Select, and Button components already updated.

- [ ] **Step 3: Verify**

Run: `npm run dev`, check `/assignments` and `/assignments/new`.
Expected: Warm card styling, DM Serif headings, frosted glass forms.

- [ ] **Step 4: Commit**

```bash
git add src/app/assignments/page.tsx src/app/assignments/new/page.tsx
git commit -m "update assignment pages to Golden Study Nook style"
```

---

### Task 13: Update Teacher Pages

**Files:**
- Modify: `src/app/(teacher)/classes/page.tsx`
- Modify: `src/app/(teacher)/classes/new/page.tsx`
- Modify: `src/app/(teacher)/classes/[classId]/page.tsx`
- Modify: `src/app/(teacher)/classes/[classId]/students/[studentId]/page.tsx`
- Modify: `src/app/(teacher)/questions/page.tsx`

- [ ] **Step 1: Update Classes list page**

In `src/app/(teacher)/classes/page.tsx`:

Find the page heading: add `font-heading text-3xl`
Find class cards: replace with `glass rounded-2xl`, add hover lift
Find borders: replace with `border-glass`

- [ ] **Step 2: Update New Class page**

In `src/app/(teacher)/classes/new/page.tsx`:

Find the page heading: add `font-heading text-3xl`
Find form card: replace with `glass rounded-2xl`

- [ ] **Step 3: Update Class Detail page**

In `src/app/(teacher)/classes/[classId]/page.tsx`:

Find the page heading: add `font-heading text-3xl`
Find student roster cards: replace with `glass rounded-2xl`, add hover lift
Find stat displays: add `font-heading` to numbers
Find borders: replace with `border-glass`

- [ ] **Step 4: Update Student Analytics page**

In `src/app/(teacher)/classes/[classId]/students/[studentId]/page.tsx`:

Find the page heading: add `font-heading text-3xl`
Find stat cards: these should use `StatCard` component — if inline, replace with `glass rounded-2xl` and `font-heading` numbers
Find mastery bars: use `bg-primary-gradient` fill
Find borders: replace with `border-glass`

- [ ] **Step 5: Update Question Bank page**

In `src/app/(teacher)/questions/page.tsx`:

Find the page heading: add `font-heading text-3xl`
Find the question list/table: replace `bg-surface` with `glass`, `border-surface` with `border-glass`
Find filter controls: warm styling via updated Select/Input components

- [ ] **Step 6: Verify all teacher pages**

Run: `npm run dev`, check `/classes`, `/classes/new`, a class detail page, a student analytics page, `/questions`.
Expected: Consistent warm styling across all teacher pages.

- [ ] **Step 7: Commit**

```bash
git add src/app/(teacher)/classes/page.tsx src/app/(teacher)/classes/new/page.tsx "src/app/(teacher)/classes/[classId]/page.tsx" "src/app/(teacher)/classes/[classId]/students/[studentId]/page.tsx" src/app/(teacher)/questions/page.tsx
git commit -m "update teacher pages to Golden Study Nook style"
```

---

### Task 14: Final Visual QA Pass

- [ ] **Step 1: Walk through every page as student**

Open browser, log in as student. Visit in order:
1. `/dashboard` — stat cards, mastery, streak, trends, weak topics
2. `/practice` — setup page
3. Start a practice session — quiz card, options, progress, timer
4. Complete session — results page
5. `/assignments` — assignment list
6. `/classes/join` — join form
7. `/profile` — profile form

Check for: broken layouts, wrong colors, missing glass effects, inconsistent fonts.

- [ ] **Step 2: Walk through every page as teacher**

Log in as teacher. Visit:
1. `/dashboard` — teacher overview
2. `/classes` — class list
3. `/classes/new` — create class form
4. A class detail page — roster
5. A student analytics page — stats
6. `/assignments` — assignment list
7. `/assignments/new` — create assignment form
8. `/questions` — question bank

Check for same issues.

- [ ] **Step 3: Fix any issues found**

Address any visual inconsistencies.

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix visual inconsistencies from QA pass"
```

- [ ] **Step 5: Push to remote**

```bash
git push origin feature/phase1-foundation
```
