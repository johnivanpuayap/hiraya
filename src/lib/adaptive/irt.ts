/**
 * 2-Parameter Logistic (2PL) Item Response Theory model.
 *
 * - theta: student ability per category, range [-4, 4]
 * - difficulty (b): question difficulty parameter
 * - discrimination (a): how sharply the question separates ability levels
 */

const THETA_MIN = -4.0;
const THETA_MAX = 4.0;

/** Probability of correct answer given ability and question parameters. */
export function probability(
  theta: number,
  difficulty: number,
  discrimination: number
): number {
  return 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
}

/**
 * Stepwise EAP theta update after a single answer.
 * Learning rate decays from 0.4 → 0.1 as questionsSeen increases.
 */
export function updateTheta(
  currentTheta: number,
  isCorrect: boolean,
  difficulty: number,
  discrimination: number,
  questionsSeen: number
): number {
  const pCorrect = probability(currentTheta, difficulty, discrimination);
  const learningRate = 0.1 + 0.3 / (1 + questionsSeen / 10);

  const delta = isCorrect
    ? learningRate * discrimination * (1 - pCorrect)
    : -learningRate * discrimination * pCorrect;

  return Math.max(THETA_MIN, Math.min(THETA_MAX, currentTheta + delta));
}

/** Fisher information — measures how much a question tells us about theta. */
export function fisherInformation(
  theta: number,
  difficulty: number,
  discrimination: number
): number {
  const p = probability(theta, difficulty, discrimination);
  return discrimination * discrimination * p * (1 - p);
}

export interface QuestionCandidate {
  id: string;
  difficulty: number;
  discrimination: number;
}

/** Select the question with maximum Fisher information for the student's theta. */
export function selectByMaxInfo(
  theta: number,
  candidates: QuestionCandidate[]
): QuestionCandidate | null {
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestInfo = fisherInformation(theta, best.difficulty, best.discrimination);

  for (let i = 1; i < candidates.length; i++) {
    const info = fisherInformation(
      theta,
      candidates[i].difficulty,
      candidates[i].discrimination
    );
    if (info > bestInfo) {
      best = candidates[i];
      bestInfo = info;
    }
  }

  return best;
}
