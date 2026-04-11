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
 * Compute overall exam readiness as a weighted average of per-category mastery.
 * Categories with questionsSeen = 0 contribute 0% (not the default 50%).
 */
export function computeReadiness(abilities: CategoryAbility[]): number {
  if (abilities.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const a of abilities) {
    totalWeight += a.examWeight;
    if (a.questionsSeen === 0) {
      // Unseen categories contribute 0%, not the 50% that theta=0 gives
      continue;
    }
    weightedSum += thetaToMastery(a.theta) * a.examWeight;
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
    .map((a) => ({
      categoryId: a.categoryId,
      displayName: a.displayName,
      mastery: a.questionsSeen > 0 ? Math.round(thetaToMastery(a.theta)) : 0,
      questionsSeen: a.questionsSeen,
      correctCount: a.correctCount,
    }))
    .sort((a, b) => a.mastery - b.mastery);
}
