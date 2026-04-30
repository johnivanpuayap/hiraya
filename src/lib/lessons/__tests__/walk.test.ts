import { describe, it, expect } from "vitest";

import path from "node:path";

import { walkLessons } from "../walk";

const TREE = path.join(__dirname, "fixtures", "tree");

describe("walkLessons", () => {
  it("parses all markdown files under the root", async () => {
    const lessons = await walkLessons(TREE);
    expect(lessons).toHaveLength(3);

    const slugs = lessons.map((l) => l.slug).sort();
    expect(slugs).toEqual([
      "category-a/01-one",
      "category-a/02-two",
      "category-b/01-three",
    ]);
  });

  it("returns lessons with validated frontmatter and hashes", async () => {
    const lessons = await walkLessons(TREE);
    for (const lesson of lessons) {
      expect(lesson.frontmatter.title).toBeDefined();
      expect(lesson.contentHash).toMatch(/^[0-9a-f]{64}$/);
      expect(lesson.quizHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
