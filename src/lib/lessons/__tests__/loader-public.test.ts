import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { _loadFromDiskForTest, getLessonForReader } from "../loader-public";

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

describe("loader-public loadFromDisk", () => {
  it("returns the body and quiz prompts", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    expect(lesson.slug).toBe("valid-lesson");
    expect(lesson.title).toBe("Sorting Algorithms");
    expect(lesson.body).toContain("# Sorting Algorithms");
    expect(lesson.quiz).toHaveLength(1);
    expect(lesson.quiz[0].prompt).toBe("What is O(n^2)?");
    expect(lesson.quiz[0].options).toHaveLength(2);
    expect(lesson.quiz[0].options[0].text).toBe("Linear");
  });

  it("does not include the correct flag on options", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    for (const q of lesson.quiz) {
      for (const o of q.options) {
        expect(o).not.toHaveProperty("correct");
      }
    }
  });

  it("does not include explanations", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    for (const q of lesson.quiz) {
      expect(q).not.toHaveProperty("explanation");
    }
  });

  it("includes content and quiz hashes", async () => {
    const lesson = await _loadFromDiskForTest("valid-lesson", FIXTURES);
    expect(lesson.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(lesson.quizHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("loader-public getLessonForReader", () => {
  it("returns null when the lesson is not in the database", async () => {
    const lesson = await getLessonForReader("does-not-exist", FIXTURES);
    expect(lesson).toBeNull();
  });
});
