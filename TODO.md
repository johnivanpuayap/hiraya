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
- [x] Vitest test suite for lib/lessons (49 tests)

### Frontend
- [x] Lesson list page grouped by category with read-state badges
- [x] Per-lesson best-quiz-score badge on the list page
- [x] Lesson reader (markdown rendering, Golden Study Nook styling)
- [x] "Mark as read" tracking via `lesson_reads`
- [x] Inline lesson quiz with red/green answer feedback and `lesson_quiz_attempts` tracking
- [x] Quiz radiogroup semantics (role, aria-checked, aria-live result, roving tabindex, focus-visible ring)
- [x] Arrow-key navigation between quiz options
- [x] Styled `not-found.tsx` for `/learn/[...slug]`
- [x] Reading progress widget on student dashboard
- [x] Tone/copy pass on lesson actions, reader, and 404

### Deferred polish
- [ ] LessonsProgress dashboard placement — currently full-width above the readiness gauge; consider compact 4-col tile alongside existing widgets
- [ ] LessonsProgress: leading book/lesson icon for parity with other dashboard widgets
- [ ] LessonsProgress: warmer 0%/100% states (empty CTA, completion celebration line)
- [ ] LessonsProgress: partial-progress threshold tone (e.g., 75% earns a different bar tint)
- [ ] Promote score pill arbitrary-value bg literals to a `bg-primary/10` token

## Phase 4: Mobile App
- [ ] Decide: React Native vs Native (Swift + Kotlin) vs PWA
- [ ] Design mobile-specific UX
- [ ] Build and deploy
