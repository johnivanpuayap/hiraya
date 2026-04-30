import type { SupabaseClient } from "@supabase/supabase-js";

import type { ParsedLesson } from "./parse";

export interface SyncOptions {
  allowOrphanedProgress: boolean;
}

export interface SyncSummary {
  inserted: number;
  updated: number;
  unchanged: number;
  softDeleted: number;
  warnings: string[];
}

interface ExistingLessonRow {
  id: string;
  slug: string;
  content_hash: string;
  deleted_at: string | null;
}

export async function applyLessonSync(
  admin: SupabaseClient,
  lessons: ParsedLesson[],
  options: SyncOptions,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    inserted: 0,
    updated: 0,
    unchanged: 0,
    softDeleted: 0,
    warnings: [],
  };

  const categorySlugs = Array.from(new Set(lessons.map((l) => l.frontmatter.category_slug)));
  const { data: categoryRows, error: catError } = await admin
    .from("categories")
    .select("id, name")
    .in("name", categorySlugs);
  if (catError) {
    throw new Error(`Failed to fetch categories: ${catError.message}`);
  }
  const categoryIdBySlug = new Map<string, string>();
  for (const row of categoryRows ?? []) {
    categoryIdBySlug.set(row.name, row.id);
  }
  const missingCategories = categorySlugs.filter((s) => !categoryIdBySlug.has(s));
  if (missingCategories.length > 0) {
    throw new Error(
      `Missing categories in DB: ${missingCategories.join(", ")}. Create them before syncing lessons.`,
    );
  }

  const { data: existingRows, error: existingError } = await admin
    .from("lessons")
    .select("id, slug, content_hash, deleted_at");
  if (existingError) {
    throw new Error(`Failed to fetch existing lessons: ${existingError.message}`);
  }
  const existingBySlug = new Map<string, ExistingLessonRow>();
  for (const row of (existingRows ?? []) as ExistingLessonRow[]) {
    existingBySlug.set(row.slug, row);
  }

  const filesystemSlugs = new Set(lessons.map((l) => l.slug));

  for (const lesson of lessons) {
    const existing = existingBySlug.get(lesson.slug);
    const categoryId = categoryIdBySlug.get(lesson.frontmatter.category_slug);
    if (!categoryId) {
      throw new Error(`Category id missing for ${lesson.frontmatter.category_slug}`);
    }

    if (!existing) {
      const { error } = await admin.from("lessons").insert({
        slug: lesson.slug,
        category_id: categoryId,
        title: lesson.frontmatter.title,
        order_index: lesson.frontmatter.order,
        estimated_minutes: lesson.frontmatter.estimated_minutes ?? null,
        content_hash: lesson.contentHash,
        quiz_hash: lesson.quizHash,
      });
      if (error) throw new Error(`Insert failed for ${lesson.slug}: ${error.message}`);
      summary.inserted += 1;
      continue;
    }

    const needsUpdate =
      existing.content_hash !== lesson.contentHash || existing.deleted_at !== null;

    if (needsUpdate) {
      const { error } = await admin
        .from("lessons")
        .update({
          category_id: categoryId,
          title: lesson.frontmatter.title,
          order_index: lesson.frontmatter.order,
          estimated_minutes: lesson.frontmatter.estimated_minutes ?? null,
          content_hash: lesson.contentHash,
          quiz_hash: lesson.quizHash,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(`Update failed for ${lesson.slug}: ${error.message}`);
      summary.updated += 1;
    } else {
      summary.unchanged += 1;
    }
  }

  const disappeared: string[] = [];
  for (const [slug, row] of existingBySlug.entries()) {
    if (row.deleted_at !== null) continue;
    if (!filesystemSlugs.has(slug)) disappeared.push(slug);
  }

  const newSlugs = lessons
    .filter((l) => !existingBySlug.has(l.slug))
    .map((l) => l.slug);

  if (disappeared.length > 0 && newSlugs.length > 0) {
    const warning = `Possible rename detected. Disappeared: [${disappeared.join(", ")}]. New: [${newSlugs.join(", ")}]. Progress rows for disappeared slugs stay attached to the soft-deleted rows.`;
    if (!options.allowOrphanedProgress) {
      throw new Error(
        `${warning}\n\nRefusing to proceed. Re-run with --allow-orphaned-progress to soft-delete the disappeared lessons and keep their history separate from the new ones.`,
      );
    }
    summary.warnings.push(warning);
  }

  for (const slug of disappeared) {
    const { error } = await admin
      .from("lessons")
      .update({ deleted_at: new Date().toISOString() })
      .eq("slug", slug);
    if (error) throw new Error(`Soft-delete failed for ${slug}: ${error.message}`);
    summary.softDeleted += 1;
  }

  return summary;
}
