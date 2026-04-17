import { readFile } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { computeContentHash, computeQuizHash } from "./hash";
import { lessonFrontmatterSchema } from "./schema";
import type { LessonFrontmatter } from "./schema";

export interface ParsedLesson {
  slug: string;
  frontmatter: LessonFrontmatter;
  body: string;
  contentHash: string;
  quizHash: string;
}

export async function parseLessonFile(
  absoluteFilePath: string,
  rootDir: string,
): Promise<ParsedLesson> {
  const raw = await readFile(absoluteFilePath, "utf8");
  const parsed = matter(raw);

  const result = lessonFrontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in ${absoluteFilePath}:\n${JSON.stringify(result.error.flatten(), null, 2)}`,
    );
  }

  const frontmatter = result.data;
  const body = parsed.content;

  const relative = path.relative(rootDir, absoluteFilePath);
  const slug = relative.replace(/\.md$/, "").split(path.sep).join("/");

  return {
    slug,
    frontmatter,
    body,
    contentHash: computeContentHash(frontmatter, body),
    quizHash: computeQuizHash(frontmatter.quiz),
  };
}
