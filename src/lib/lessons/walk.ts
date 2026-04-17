import { readdir } from "node:fs/promises";
import path from "node:path";

import { parseLessonFile } from "./parse";
import type { ParsedLesson } from "./parse";

export async function walkLessons(rootDir: string): Promise<ParsedLesson[]> {
  const files = await collectMarkdownFiles(rootDir);
  return Promise.all(files.map((file) => parseLessonFile(file, rootDir)));
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(full);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      results.push(full);
    }
  }
  return results;
}
