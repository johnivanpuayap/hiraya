# Hiraya — TODO

## Phase 3: Learn / Lessons

### Backend
- [x] File-based markdown lessons (`content/lessons/`) with frontmatter schema
- [x] Parser, walker, hash-based cache with DB invalidation
- [x] Public loader (no answer keys) and server-only loader (with answer keys)
- [x] Sync logic with soft-delete and rename detection
- [x] Advisory-lock for sync concurrency safety (held client-side via direct pg connection)
- [x] Migrations: `lessons`, `lesson_reads`, `lesson_quiz_attempts` with RLS
- [x] CLI scripts: `sync-lessons`, `migrate`
- [x] Vitest test suite for lib/lessons

### Frontend
- [x] Lesson list page grouped by category with read-state badges
- [x] Lesson reader (markdown rendering, Golden Study Nook styling)
- [x] "Mark as read" tracking via `lesson_reads`
- [x] Inline lesson quiz with red/green answer feedback and `lesson_quiz_attempts` tracking
- [ ] Per-lesson best-quiz-score badge on the list page (TODO comment in code)
- [ ] Reading progress widget on student dashboard
- [ ] Styled `not-found.tsx` for `/learn/[...slug]` (currently falls back to default 404)
- [ ] Arrow-key navigation between quiz radio options
- [ ] Tone/copy polish pass on action error messages and reader UI

## Phase 4: Mobile App
- [ ] Decide: React Native vs Native (Swift + Kotlin) vs PWA
- [ ] Design mobile-specific UX
- [ ] Build and deploy
