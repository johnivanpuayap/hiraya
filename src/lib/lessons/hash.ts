import { createHash } from "node:crypto";

import type { LessonFrontmatter, LessonQuizQuestion } from "./schema";

/**
 * Hash of everything that affects lesson rendering — frontmatter + body.
 * A change here invalidates the in-memory loader cache.
 */
export function computeContentHash(
  frontmatter: LessonFrontmatter,
  body: string,
): string {
  return sha256(canonicalize(frontmatter) + "\0" + body);
}

/**
 * Hash of the quiz-answering surface only — prompts, options, correct flags.
 * Does NOT include explanations, so explanation-only edits leave drafts intact.
 */
export function computeQuizHash(quiz: LessonQuizQuestion[]): string {
  const shape = quiz.map((q) => ({
    prompt: q.prompt,
    options: q.options.map((o) => ({
      text: o.text,
      correct: o.correct === true,
    })),
  }));
  return sha256(canonicalize(shape));
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Canonicalize by sorting object keys recursively so that the hash is
 * independent of YAML key ordering.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]));
  return "{" + parts.join(",") + "}";
}
