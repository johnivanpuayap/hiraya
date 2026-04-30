# Hiraya — TODO

## Phase 3: Learn / Lessons

### Backend (in progress on `feature/phase3-lessons`)
- [x] File-based markdown lessons (`content/lessons/`) with frontmatter schema
- [x] Parser, walker, hash-based cache with DB invalidation
- [x] Public loader (no answer keys) and server-only loader (with answer keys)
- [x] Sync logic with soft-delete and rename detection
- [x] Advisory-lock RPC for sync concurrency safety
- [x] Migrations: `lessons`, `lesson_reads`, `lesson_quiz_attempts` with RLS
- [x] CLI scripts: `sync-lessons`, `migrate`
- [x] Vitest test suite for lib/lessons
- [ ] Code review and merge into main

### Frontend (not started)
- [ ] Lesson list page grouped by category
- [ ] Individual lesson reader (markdown rendering, Golden Study Nook styling)
- [ ] "Mark as read" tracking via `lesson_reads`
- [ ] Optional inline quiz attempt tracking via `lesson_quiz_attempts`
- [ ] Reading progress on student dashboard

## Phase 4: Mobile App
- [ ] Decide: React Native vs Native (Swift + Kotlin) vs PWA
- [ ] Design mobile-specific UX
- [ ] Build and deploy

## Tech debt / housekeeping
- [ ] Triage `hotfix/performance-optimization` (stale branch, may overlap with already-merged perf work on main)
- [ ] Delete merged/empty remote branches: `feature/phase1-foundation`, `feature/phase2-per-session-reactivity`, `feature/phase2-teacher-analytics`, `hotfix/teacher-side-updates`, `master`
