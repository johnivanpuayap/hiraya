import path from "node:path";

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

export async function getLessonForReader(
  slug: string,
  rootDir: string = DEFAULT_ROOT,
): Promise<PublicLesson> {
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
