# Hiraya — Claude Code Instructions

## Project Overview

Hiraya is a PhilNITS exam reviewer platform — "Aral hanggang pasa" (Study until you pass).
Built with Next.js (App Router), Tailwind CSS, Supabase (Auth + PostgreSQL), TypeScript.

## Design System

**ALWAYS follow the design docs when creating any UI:**
- Read `docs/design.md` for the visual identity (Golden Hour palette, typography, illustration style)
- Read the spec in `docs/superpowers/specs/` for feature specs and component architecture
- Use the Golden Hour color palette — never use default gray/blue Tailwind colors
- Typography: Nunito for headings, Inter for body text
- All cards and containers use rounded-xl (12px border radius) with warm-tinted shadows
- Keep the "playful surface, serious progress underneath" personality

## Coding Standards

Follow `docs/coding-standards.md` for all code written in this project. Key points:

- **Strict TypeScript** — no `any`, no `as` escape hatches, strict mode enabled
- **File naming** — kebab-case for files/folders, PascalCase for component exports
- **Server Components by default** — only add "use client" when the component needs browser APIs or interactivity
- **Logging** — log important operations (auth events, session starts, adaptive engine decisions, errors)

## Git

- **Atomic commits** — one logical change per commit
- **No co-author tags** — never append "Co-Authored-By" lines to commit messages
- **Branch naming** — `feat/`, `fix/`, `chore/` prefixes (e.g., `feat/adaptive-engine`)
- **Commit messages** — imperative mood, concise (e.g., "add IRT ability estimation logic")
