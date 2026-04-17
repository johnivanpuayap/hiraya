import { describe, it, expect } from "vitest";
import path from "node:path";
import { _loadFromDiskForTest } from "../loader-server-only";

const FIXTURES = path.join(__dirname, "fixtures");

describe("loader-server-only loadFromDisk", () => {
  it("returns prompts, options, correct flags, and explanations", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    expect(lesson.slug).toBe("valid-lesson");
    expect(lesson.quiz).toHaveLength(1);

    const q = lesson.quiz[0];
    expect(q.prompt).toBe("What is O(n^2)?");
    expect(q.explanation).toBe("Quadratic grows with the square of n.");
    expect(q.correctIndex).toBe(1);
    expect(q.options).toEqual([
      { text: "Linear" },
      { text: "Quadratic" },
    ]);
  });

  it("includes content and quiz hashes", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    expect(lesson.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lesson.quizHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
