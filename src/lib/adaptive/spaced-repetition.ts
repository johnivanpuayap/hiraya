/**
 * Modified SM-2 spaced repetition algorithm.
 * Binary-correct mapping: wrong → quality 1, correct → quality 4.
 */

export interface ReviewState {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
}

export interface ReviewUpdate extends ReviewState {
  nextReviewAt: Date;
}

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;

/** Compute new review schedule after an answer. */
export function computeReview(
  isCorrect: boolean,
  current: ReviewState | null
): ReviewUpdate {
  const prev: ReviewState = current ?? {
    intervalDays: 1.0,
    easeFactor: DEFAULT_EASE_FACTOR,
    repetitions: 0,
  };

  const quality = isCorrect ? 4 : 1;
  let intervalDays: number;
  let easeFactor: number;
  let repetitions: number;

  if (quality < 3) {
    // Wrong answer — reset
    repetitions = 0;
    intervalDays = 1.0;
    easeFactor = Math.max(MIN_EASE_FACTOR, prev.easeFactor - 0.2);
  } else {
    // Correct answer — advance
    repetitions = prev.repetitions + 1;
    if (repetitions === 1) {
      intervalDays = 1.0;
    } else if (repetitions === 2) {
      intervalDays = 6.0;
    } else {
      intervalDays = prev.intervalDays * prev.easeFactor;
    }
    easeFactor = Math.max(
      MIN_EASE_FACTOR,
      prev.easeFactor +
        (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
  }

  const nextReviewAt = new Date();
  nextReviewAt.setTime(
    nextReviewAt.getTime() + intervalDays * 24 * 60 * 60 * 1000
  );

  return { intervalDays, easeFactor, repetitions, nextReviewAt };
}
