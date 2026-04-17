import { describe, it, expect } from "vitest";
import { computeContentHash, computeQuizHash } from "../hash";
import type { LessonFrontmatter } from "../schema";

const baseFrontmatter: LessonFrontmatter = {
  title: "Sorting",
  category_slug: "algorithms",
  order: 1,
  estimated_minutes: 10,
  quiz: [
    {
      prompt: "What is O(n^2)?",
      options: [
        { text: "Linear" },
        { text: "Quadratic", correct: true },
      ],
      explanation: "Squared growth.",
    },
  ],
};

const baseBody = "# Sorting\n\nBody content here.";

describe("computeContentHash", () => {
  it("is stable for identical input", () => {
    const a = computeContentHash(baseFrontmatter, baseBody);
    const b = computeContentHash(baseFrontmatter, baseBody);
    expect(a).toBe(b);
  });

  it("changes when body changes", () => {
    const a = computeContentHash(baseFrontmatter, baseBody);
    const b = computeContentHash(baseFrontmatter, baseBody + "\nmore");
    expect(a).not.toBe(b);
  });

  it("changes when a frontmatter field changes", () => {
    const a = computeContentHash(baseFrontmatter, baseBody);
    const b = computeContentHash({ ...baseFrontmatter, title: "Other" }, baseBody);
    expect(a).not.toBe(b);
  });

  it("changes when an explanation changes", () => {
    const a = computeContentHash(baseFrontmatter, baseBody);
    const withEditedExplanation: LessonFrontmatter = {
      ...baseFrontmatter,
      quiz: [{ ...baseFrontmatter.quiz[0], explanation: "A different explanation." }],
    };
    const b = computeContentHash(withEditedExplanation, baseBody);
    expect(a).not.toBe(b);
  });
});

describe("computeQuizHash", () => {
  it("is stable for identical quiz", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const b = computeQuizHash(baseFrontmatter.quiz);
    expect(a).toBe(b);
  });

  it("is UNCHANGED when only an explanation changes", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const b = computeQuizHash([
      { ...baseFrontmatter.quiz[0], explanation: "A different explanation." },
    ]);
    expect(a).toBe(b);
  });

  it("changes when a prompt changes", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const b = computeQuizHash([{ ...baseFrontmatter.quiz[0], prompt: "Different?" }]);
    expect(a).not.toBe(b);
  });

  it("changes when an option text changes", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const q = baseFrontmatter.quiz[0];
    const b = computeQuizHash([
      { ...q, options: [{ text: "Changed" }, { text: "Quadratic", correct: true }] },
    ]);
    expect(a).not.toBe(b);
  });

  it("changes when the correct option moves", () => {
    const a = computeQuizHash(baseFrontmatter.quiz);
    const b = computeQuizHash([
      {
        ...baseFrontmatter.quiz[0],
        options: [
          { text: "Linear", correct: true },
          { text: "Quadratic" },
        ],
      },
    ]);
    expect(a).not.toBe(b);
  });

  it("treats missing correct flag as equivalent to correct: false", () => {
    const withMissing = computeQuizHash([
      {
        prompt: "p",
        options: [{ text: "a" }, { text: "b", correct: true }],
        explanation: "",
      },
    ]);
    const withExplicitFalse = computeQuizHash([
      {
        prompt: "p",
        options: [
          { text: "a", correct: false },
          { text: "b", correct: true },
        ],
        explanation: "",
      },
    ]);
    expect(withMissing).toBe(withExplicitFalse);
  });

  it("is insensitive to object-key order in the input", () => {
    const a = computeQuizHash([
      {
        prompt: "p",
        options: [{ text: "a" }, { text: "b", correct: true }],
        explanation: "",
      },
    ]);
    const b = computeQuizHash([
      {
        explanation: "",
        options: [{ text: "a" }, { correct: true, text: "b" }],
        prompt: "p",
      },
    ]);
    expect(a).toBe(b);
  });
});
