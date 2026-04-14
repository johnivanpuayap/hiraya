/**
 * Analytics calculations for the student dashboard.
 * All functions are pure — they take data and return computed values.
 */

interface CategoryAbility {
  categoryId: string;
  theta: number;
  questionsSeen: number;
  correctCount: number;
  examWeight: number;
  displayName: string;
}

/** Map theta to 0-100% mastery via logistic function. */
export function thetaToMastery(theta: number): number {
  return 100 / (1 + Math.exp(-theta));
}

/**
 * Confidence multiplier based on questions seen.
 * With few questions, IRT theta estimates are unreliable — scale down mastery
 * so a student answering 1-2 questions doesn't appear 45-50% ready.
 * Reaches full confidence (~95%) at around 15 questions per category.
 */
function confidenceWeight(questionsSeen: number): number {
  if (questionsSeen === 0) return 0;
  return 1 - Math.exp(-questionsSeen / 5);
}

/**
 * Compute overall exam readiness as a weighted average of per-category mastery,
 * scaled by confidence (questions seen per category).
 */
export function computeReadiness(abilities: CategoryAbility[]): number {
  if (abilities.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const a of abilities) {
    totalWeight += a.examWeight;
    if (a.questionsSeen === 0) continue;

    const mastery = thetaToMastery(a.theta);
    const confidence = confidenceWeight(a.questionsSeen);
    weightedSum += mastery * confidence * a.examWeight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/** Get per-category mastery data sorted by mastery ascending (weakest first). */
export function getCategoryMastery(
  abilities: CategoryAbility[]
): Array<{
  categoryId: string;
  displayName: string;
  mastery: number;
  questionsSeen: number;
  correctCount: number;
}> {
  return abilities
    .map((a) => {
      if (a.questionsSeen === 0) {
        return {
          categoryId: a.categoryId,
          displayName: a.displayName,
          mastery: 0,
          questionsSeen: 0,
          correctCount: 0,
        };
      }

      const rawMastery = thetaToMastery(a.theta);
      const confidence = confidenceWeight(a.questionsSeen);
      return {
        categoryId: a.categoryId,
        displayName: a.displayName,
        mastery: Math.round(rawMastery * confidence),
        questionsSeen: a.questionsSeen,
        correctCount: a.correctCount,
      };
    })
    .sort((a, b) => a.mastery - b.mastery);
}
