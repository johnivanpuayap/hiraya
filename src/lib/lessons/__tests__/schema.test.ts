import { describe, it, expect } from "vitest";

import { lessonFrontmatterSchema } from "../schema";

describe("lessonFrontmatterSchema", () => {
  const validFrontmatter = {
    title: "Sorting Algorithms",
    category_slug: "algorithms",
    order: 1,
    estimated_minutes: 15,
    quiz: [
      {
        prompt: "What is O(n^2)?",
        options: [
          { text: "Linear" },
          { text: "Quadratic", correct: true },
          { text: "Constant" },
        ],
        explanation: "Quadratic grows with the square of n.",
      },
    ],
  };

  it("accepts a valid lesson", () => {
    expect(() => lessonFrontmatterSchema.parse(validFrontmatter)).not.toThrow();
  });

  it("requires title", () => {
    const { title, ...rest } = validFrontmatter;
    expect(() => lessonFrontmatterSchema.parse(rest)).toThrow();
  });

  it("requires category_slug", () => {
    const { category_slug, ...rest } = validFrontmatter;
    expect(() => lessonFrontmatterSchema.parse(rest)).toThrow();
  });

  it("requires order", () => {
    const { order, ...rest } = validFrontmatter;
    expect(() => lessonFrontmatterSchema.parse(rest)).toThrow();
  });

  it("allows missing estimated_minutes", () => {
    const { estimated_minutes, ...rest } = validFrontmatter;
    expect(() => lessonFrontmatterSchema.parse(rest)).not.toThrow();
  });

  it("rejects empty quiz", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validFrontmatter, quiz: [] })
    ).toThrow();
  });

  it("rejects a question with only one option", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [{ text: "only", correct: true }],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects a question with more than six options", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [
              { text: "a" },
              { text: "b" },
              { text: "c" },
              { text: "d" },
              { text: "e" },
              { text: "f" },
              { text: "g", correct: true },
            ],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects a question with zero correct options", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [{ text: "a" }, { text: "b" }],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects a question with multiple correct options", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [
              { text: "a", correct: true },
              { text: "b", correct: true },
            ],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("requires explanation on every question", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [{ text: "a" }, { text: "b", correct: true }],
          },
        ],
      })
    ).toThrow();
  });

  it("rejects unknown top-level keys", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validFrontmatter, categorySlug: "oops" })
    ).toThrow();
  });

  it("rejects unknown keys on quiz questions", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [{ text: "a" }, { text: "b", correct: true }],
            explanation: "e",
            hint: "unknown",
          },
        ],
      })
    ).toThrow();
  });

  it("rejects unknown keys on quiz options", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [
              { text: "a", weight: 1 },
              { text: "b", correct: true },
            ],
            explanation: "e",
          },
        ],
      })
    ).toThrow();
  });

  it("treats correct: false as not correct", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({
        ...validFrontmatter,
        quiz: [
          {
            prompt: "x",
            options: [
              { text: "a", correct: false },
              { text: "b", correct: true },
            ],
            explanation: "e",
          },
        ],
      })
    ).not.toThrow();
  });

  it("accepts order: 0", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validFrontmatter, order: 0 })
    ).not.toThrow();
  });

  it("rejects negative order", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validFrontmatter, order: -1 })
    ).toThrow();
  });

  it("rejects non-integer order", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validFrontmatter, order: 1.5 })
    ).toThrow();
  });

  it("rejects non-integer estimated_minutes", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validFrontmatter, estimated_minutes: 12.3 })
    ).toThrow();
  });

  it("includes the found-count in the 'exactly one correct' error", () => {
    const result = lessonFrontmatterSchema.safeParse({
      ...validFrontmatter,
      quiz: [
        {
          prompt: "x",
          options: [
            { text: "a", correct: true },
            { text: "b", correct: true },
            { text: "c", correct: true },
          ],
          explanation: "e",
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(" ");
      expect(message).toContain("found 3");
    }
  });
});
