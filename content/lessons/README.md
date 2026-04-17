# Lesson Authoring Guide

Lessons live in this directory as Markdown files with YAML frontmatter. They
are admin-authored, committed to git, and synced into the Supabase `lessons`
table by `pnpm sync-lessons`.

## Directory layout

```
content/lessons/
  <category-slug>/
    01-<lesson-slug>.md
    02-<lesson-slug>.md
```

- `<category-slug>` must match a row's `name` in the `categories` table.
- The filename prefix (`01-`, `02-`, ...) controls display order.
- Slug (filename minus `.md`) is globally unique across categories.

## Frontmatter template

```yaml
---
title: "Sorting Algorithms"
category_slug: "algorithms"
order: 1
estimated_minutes: 15
quiz:
  - prompt: "What is the worst-case time complexity of bubble sort?"
    options:
      - text: "O(n)"
      - text: "O(n log n)"
      - text: "O(n²)"
        correct: true
      - text: "O(1)"
    explanation: |
      Bubble sort makes a full pass for each of `n` elements in the worst
      case, yielding **O(n²)**. See the lesson body for the derivation.
---

# Lesson body in Markdown.
```

## Rules the sync enforces

- `title`, `category_slug`, `order`, `quiz` are required. `estimated_minutes` is optional.
- Each quiz question must have 2–6 options, exactly one marked `correct: true`, and a non-empty `explanation`.
- All content (prompts, options, explanations) may contain Markdown (code blocks, tables, inline formatting). Explanations render with the same Markdown pipeline as the lesson body.

## Adding a new lesson

1. Create the Markdown file under the correct category folder.
2. Run `npm run sync-lessons` to register it in the database.
3. The student-facing Learn section picks up the new lesson on next page load.

## Renaming or deleting a lesson

**Renaming the slug (filename)** is treated as delete + create. The sync script
refuses to proceed when it detects both a disappeared slug and a newly-appeared
slug in the same run. If you are certain you want to proceed — e.g., because
the old lesson is obsolete and the new one is genuinely different content —
re-run with:

```bash
npm run sync-lessons -- --allow-orphaned-progress
```

This soft-deletes the old slug (existing student progress rows stay attached to
the now-soft-deleted lesson). Progress rows are never automatically migrated
to the new slug.

**Deleting a lesson** is the same — remove the file and run `sync-lessons`. The
row is soft-deleted; student progress history is preserved.

**Moving a lesson to a different category** — change `category_slug` in the
frontmatter and keep the filename the same. The sync updates the
`category_id` without touching progress.

## Editing an existing lesson

- Edits to body or frontmatter that change any content produce a new
  `content_hash`. The in-memory loader cache invalidates automatically on the
  next read.
- Edits that affect only explanations leave `quiz_hash` unchanged, so
  students' in-progress quiz drafts survive the edit.
- Edits to prompts, options, or which option is `correct` change `quiz_hash`
  and will discard any in-progress drafts for that lesson.

## Troubleshooting

| Error | Fix |
|---|---|
| `Missing categories in DB: xyz` | Create the category in the `categories` table first (via existing admin tooling). |
| `Invalid frontmatter in <file>` | The YAML failed Zod validation. The message includes the exact path and missing/invalid fields. |
| `Possible rename detected. ... Refusing to proceed.` | Re-run with `-- --allow-orphaned-progress` if you truly want to proceed. |
