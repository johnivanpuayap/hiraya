import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { _loadFromDiskForTest, getLessonForGrading } from "../loader-server-only";

const FIXTURES = path.join(__dirname, "fixtures");

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

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

describe("loader-server-only getLessonForGrading", () => {
  it("returns null when the lesson is not in the database", async () => {
    const lesson = await getLessonForGrading("does-not-exist", FIXTURES);
    expect(lesson).toBeNull();
  });
});
