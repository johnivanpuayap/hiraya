import path from "node:path";

import { createAdminClient } from "@/lib/supabase/admin";

import { createLessonCache, shouldBypassCache } from "./cache";
import { parseLessonFile } from "./parse";

export interface PublicQuizOption {
  text: string;
}

export interface PublicQuizQuestion {
  prompt: string;
  options: PublicQuizOption[];
}

export interface PublicLesson {
  slug: string;
  title: string;
  categorySlug: string;
  order: number;
  estimatedMinutes?: number;
  body: string;
  quiz: PublicQuizQuestion[];
  contentHash: string;
  quizHash: string;
}

const DEFAULT_ROOT = path.join(process.cwd(), "content", "lessons");

const cache = createLessonCache<PublicLesson>({ bypass: shouldBypassCache() });

export async function getLessonForReader(
  slug: string,
  rootDir: string = DEFAULT_ROOT,
): Promise<PublicLesson | null> {
  const currentHash = await fetchContentHashFromDB(slug);
  if (currentHash === null) {
    return null;
  }
  return cache.getOrLoad(slug, currentHash, () => loadFromDisk(slug, rootDir));
}

async function loadFromDisk(slug: string, rootDir: string): Promise<PublicLesson> {
  const absoluteFilePath = path.join(rootDir, `${slug}.md`);
  const parsed = await parseLessonFile(absoluteFilePath, rootDir);

  return {
    slug: parsed.slug,
    title: parsed.frontmatter.title,
    categorySlug: parsed.frontmatter.category_slug,
    order: parsed.frontmatter.order,
    estimatedMinutes: parsed.frontmatter.estimated_minutes,
    body: parsed.body,
    quiz: parsed.frontmatter.quiz.map((q) => ({
      prompt: q.prompt,
      options: q.options.map((o) => ({ text: o.text })),
    })),
    contentHash: parsed.contentHash,
    quizHash: parsed.quizHash,
  };
}

async function fetchContentHashFromDB(slug: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("content_hash")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data.content_hash;
}

export { loadFromDisk as _loadFromDiskForTest };
