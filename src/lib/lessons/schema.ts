import { z } from "zod";

const lessonQuizOptionSchema = z
  .object({
    text: z.string().min(1),
    correct: z.boolean().optional(),
  })
  .strict();

const lessonQuizQuestionSchema = z
  .object({
    prompt: z.string().min(1),
    options: z.array(lessonQuizOptionSchema).min(2).max(6),
    explanation: z.string().min(1),
  })
  .strict()
  .superRefine((q, ctx) => {
    const correctCount = q.options.filter((o) => o.correct === true).length;
    if (correctCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: `quiz question must have exactly one option with correct: true (found ${correctCount})`,
        path: ["options"],
      });
    }
  });

export const lessonFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    category_slug: z.string().min(1),
    order: z.number().int().nonnegative(),
    estimated_minutes: z.number().int().positive().optional(),
    quiz: z.array(lessonQuizQuestionSchema).min(1),
  })
  .strict();

export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;
export type LessonQuizQuestion = z.infer<typeof lessonQuizQuestionSchema>;
export type LessonQuizOption = z.infer<typeof lessonQuizOptionSchema>;
