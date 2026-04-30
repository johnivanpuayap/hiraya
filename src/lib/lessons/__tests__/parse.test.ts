import { describe, it, expect } from "vitest";

import path from "node:path";

import { parseLessonFile } from "../parse";

const FIXTURES = path.join(__dirname, "fixtures");

describe("parseLessonFile", () => {
  it("parses a valid lesson", async () => {
    const result = await parseLessonFile(
      path.join(FIXTURES, "valid-lesson.md"),
      FIXTURES,
    );
    expect(result.slug).toBe("valid-lesson");
    expect(result.frontmatter.title).toBe("Sorting Algorithms");
    expect(result.frontmatter.category_slug).toBe("algorithms");
    expect(result.body).toContain("# Sorting Algorithms");
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.quizHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws on invalid frontmatter with a file path in the message", async () => {
    const file = path.join(FIXTURES, "invalid-lesson.md");
    await expect(parseLessonFile(file, FIXTURES)).rejects.toThrow(
      /invalid-lesson\.md/,
    );
  });

  it("derives slug from the path relative to the root", async () => {
    const parent = path.resolve(FIXTURES, "..");
    const result = await parseLessonFile(
      path.join(FIXTURES, "valid-lesson.md"),
      parent,
    );
    expect(result.slug).toBe("fixtures/valid-lesson");
  });
});
