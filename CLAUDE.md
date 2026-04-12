# Hiraya — Claude Code Instructions

## Project Overview

Hiraya is a PhilNITS exam reviewer platform — "Aral hanggang pasa" (Study until you pass).
Built with Next.js (App Router), Tailwind CSS, Supabase (Auth + PostgreSQL), TypeScript.

## Design System

**ALWAYS follow the design docs when creating any UI:**
- Read `docs/design.md` for the visual identity (Golden Study Nook palette, typography, layout)
- Read the spec in `docs/superpowers/specs/` for feature specs and component architecture
- Use the Golden Study Nook color palette — never use default gray/blue Tailwind colors
- Typography: DM Serif Display for headings, Inter for body text
- All cards use frosted glass (16px border radius, backdrop-blur, warm golden borders/shadows)
- Keep the "cozy study cafe" personality — warm, inviting, relaxed focus

## Coding Standards

Follow `docs/coding-standards.md` for all code written in this project. Key points:

- **Strict TypeScript** — no `any`, no `as` escape hatches, strict mode enabled
- **File naming** — kebab-case for files/folders, PascalCase for component exports
- **Server Components by default** — only add "use client" when the component needs browser APIs or interactivity
- **Logging** — log important operations (auth events, session starts, adaptive engine decisions, errors)

## Git

- **Atomic commits** — one logical change per commit
- **No co-author tags** — never append "Co-Authored-By" lines to commit messages
- **Branch naming:**
  - Feature branches: `feature/<name>` (e.g., `feature/adaptive-engine`)
  - Fix branches: `hotfix/<name>` (e.g., `hotfix/login-redirect`)
  - Chore branches: `chore/<name>` (e.g., `chore/update-deps`)
- **Commit messages** — imperative mood, concise (e.g., "add IRT ability estimation logic")
- **Push after every task** — push changes to remote after every reviewed and confirmed task
