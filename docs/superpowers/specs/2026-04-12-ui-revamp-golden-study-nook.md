# UI Revamp — Golden Study Nook

## Overview

Revamp Hiraya's UI from generic/plain to a distinctive "cozy study cafe" aesthetic. The existing structure and pages stay the same — this is a visual polish pass across the entire app.

**Direction:** Golden Study Nook — atmospheric warmth, frosted glass surfaces, ambient light effects, refined serif + sans typography pairing.

**Vibe:** Cozy study cafe. Warm, inviting, relaxed focus. Like studying at your favorite coffee shop.

**Motion:** Subtle and smooth. Gentle transitions, nothing flashy.

---

## Color Palette — Evolved Golden Hour

| Role | Hex / Value | Notes |
|------|-------------|-------|
| Primary | `#C77B1A` | Deep amber — more grounded than previous `#F5A623` |
| Primary Light | `#E6A040` | Warm gold — for gradients and highlights |
| Primary Glow | `rgba(199, 123, 26, 0.15)` | Tinted backgrounds, hover states |
| Secondary | `#B85A3B` | Rich terracotta |
| Background | `linear-gradient(160deg, #FBF4E9, #F6EDD8, #F2E5CF)` | Warm shift like afternoon light |
| Surface | `rgba(255, 250, 240, 0.75)` with `backdrop-filter: blur(12px)` | Frosted glass |
| Surface Solid | `#FFFAF0` | Fallback for no-blur contexts |
| Glass Border | `rgba(199, 123, 26, 0.15)` | Warm golden tint borders |
| Text Primary | `#2A1D0E` | Deep espresso |
| Text Secondary | `#6B5640` | Warm mid-brown |
| Text Muted | `#9C876E` | Labels, metadata |
| Success | `#5A8E4C` | Muted forest green |
| Danger | `#BF4A2D` | Refined deep red |
| Border | `rgba(139, 94, 60, 0.1)` | Subtle warm dividers |

---

## Typography

| Role | Font | Size | Weight | Notes |
|------|------|------|--------|-------|
| Page titles (h1) | DM Serif Display | 30px | Regular | Elegant, not heavy |
| Card titles (h3) | DM Serif Display | 18px | Regular | Warm personality |
| Stat numbers | DM Serif Display | 34px | Regular | Intentional, designed |
| Quiz question text | DM Serif Display | 20px | Regular | Important, not clinical |
| Labels/metadata | Inter | 11px | 600 | Uppercase, 0.6px letter-spacing |
| Body text/options | Inter | 14px | 400-500 | Readable and neutral |
| Tagline | Inter | 11px | 400 italic | Personal touch |

---

## Card & Surface Treatment

**Cards:**
- Background: `rgba(255, 250, 240, 0.75)` with `backdrop-filter: blur(12px)`
- Border: `1px solid rgba(199, 123, 26, 0.15)`
- Shadow: `0 2px 12px rgba(42, 29, 14, 0.05)`
- Border radius: `16px`
- Hover: shadow deepens to `0 8px 32px rgba(42, 29, 14, 0.1)`, `translateY(-2px)`

**Stat cards:**
- Hidden 3px golden gradient bar along top edge, fades in on hover

**Sidebar:**
- Frosted glass (same as cards)
- Active nav: 3px left accent bar in primary, `rgba(199, 123, 26, 0.15)` background

**Quiz options:**
- Background: `rgba(255, 250, 240, 0.4)`
- Hover: `translateX(4px)` + golden tint
- Selected: golden border + glow shadow

**Buttons:**
- Primary: gradient `#C77B1A` → `#E6A040`, golden box-shadow, lifts on hover
- Ghost: transparent with warm border, golden tint fill on hover

---

## Atmospheric Effects

**Background:**
- Warm gradient: `linear-gradient(160deg, #FBF4E9, #F6EDD8, #F2E5CF)`
- Ambient light orb top-right: `radial-gradient(circle, rgba(230, 160, 64, 0.12), transparent 70%)` — 600px, fixed
- Ambient light orb bottom-left: `radial-gradient(circle, rgba(184, 90, 59, 0.06), transparent 70%)` — 500px, fixed

**Decorative accents:**
- Quiz cards: golden corner glow (top-right) via `::before`
- Streak number: soft radial glow underneath
- Activity grid cells: `scale(1.2)` on hover

---

## Motion

All CSS `transition` only — no animation libraries.

| Element | Effect | Duration | Easing |
|---------|--------|----------|--------|
| Card hover | `translateY(-2px)` + shadow deepen | `0.3s` | ease |
| Option hover | `translateX(4px)` + golden tint | `0.25s` | ease |
| Button hover | `translateY(-2px)` + shadow grow | `0.25s` | ease |
| Stat card top bar | opacity fade-in | `0.3s` | ease |
| Progress bar fill | width | `0.6s` | ease |
| Activity cell hover | `scale(1.2)` | `0.15s` | ease |

---

## Full Page Scope

### Pages (16)

| Route | Treatment |
|-------|-----------|
| `/` | Auth check redirect — no UI |
| `/login` | Centered frosted glass card, DM Serif heading, ambient orbs visible |
| `/register` | Same as login |
| `/dashboard` | Stat cards, mastery bars, streak, activity grid — all frosted glass |
| `/practice` | Setup card with category selection, DM Serif heading |
| `/practice/[sessionId]` | Quiz card as previewed — serif question text, option slides, golden progress |
| `/practice/[sessionId]/results` | Score in large DM Serif, category breakdown with mastery bars |
| `/assignments` | List view with frosted glass cards per item |
| `/assignments/new` | Frosted glass form, warm inputs with golden focus ring |
| `/classes/join` | Frosted glass card with join form |
| `/profile` | Form inputs with warm borders, golden focus ring |
| `/classes` | Teacher class list, frosted glass cards |
| `/classes/new` | Class creation form, same frosted glass treatment |
| `/classes/[classId]` | Class detail, roster list with warm cards |
| `/classes/[classId]/students/[studentId]` | Student analytics — stat cards + mastery bars |
| `/questions` | Question bank table with warm borders and surface colors |

### Layouts (6)

| Layout | Treatment |
|--------|-----------|
| Root layout | Load DM Serif Display + Inter fonts, set gradient background |
| Auth layout | Centered container, ambient orbs, logo |
| Student layout | Frosted glass sidebar + header |
| Teacher layout | Frosted glass sidebar + header |
| Dashboard layout | Frosted glass sidebar + header |
| Assignments layout | Frosted glass sidebar + header |

### Components (16)

| Component | Treatment |
|-----------|-----------|
| Button | Primary: golden gradient + shadow. Ghost: warm border + tint hover |
| Card | Frosted glass, warm border, 16px radius, hover lift |
| Input | Warm border, golden focus ring |
| Select | Warm border, golden focus ring, warm dropdown |
| Toast | Golden border, warm background |
| Logo | Existing SVG, no change needed |
| Sidebar | Frosted glass, golden active indicator |
| Header | Warm tones, avatar with golden gradient |
| NavLink | Golden active state with left accent bar |
| QuestionCard | DM Serif question text, option hover slides |
| Timer | Warm styling consistent with cards |
| ProgressBar | Golden gradient fill |
| AnswerFeedback | Refined success (#5A8E4C) / danger (#BF4A2D) colors |
| QuizNav | Warm button styling |
| StatCard | Frosted glass, hidden top bar on hover |
| MasteryChart, ReadinessGauge, StreakDisplay, WeakTopics, TrendGraph | Warm palette, DM Serif for numbers |

---

## Reference

Preview mockup: `docs/crucible/approach-b-golden-study-nook.html`
