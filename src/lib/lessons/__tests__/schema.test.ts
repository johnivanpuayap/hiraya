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
});
