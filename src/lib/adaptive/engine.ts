import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { selectByMaxInfo, updateTheta } from "./irt";
import { computeReview } from "./spaced-repetition";

type AdminClient = SupabaseClient<Database>;

// ─── Question Selection ───────────────────────────────────────

export interface SelectedQuestion {
  id: string;
  questionText: string;
  imageUrl: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  categoryId: string;
  difficulty: number;
  discrimination: number;
}

/**
 * Select the next question for a student in a session.
 * Priority: overdue reviews → weakest category → max Fisher info.
 */
export async function getNextQuestion(
  studentId: string,
  sessionId: string,
  categoryIds: string[] | null,
  admin: AdminClient
): Promise<SelectedQuestion | null> {
  // Get IDs of questions already answered in this session
  const { data: answered } = await admin
    .from("responses")
    .select("question_id")
    .eq("session_id", sessionId);

  const answeredIds = (answered ?? []).map((r) => r.question_id);

  // 1. Check for overdue reviews
  const overdueQuestion = await getOverdueReview(
    studentId,
    answeredIds,
    categoryIds,
    admin
  );
  if (overdueQuestion) return overdueQuestion;

  // 2. Find weakest category and select by IRT
  return getIRTQuestion(studentId, answeredIds, categoryIds, admin);
}

async function getOverdueReview(
  studentId: string,
  excludeIds: string[],
  categoryIds: string[] | null,
  admin: AdminClient
): Promise<SelectedQuestion | null> {
  const query = admin
    .from("review_schedule")
    .select("question_id")
    .eq("student_id", studentId)
    .lt("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(20);

  const { data: overdue } = await query;
  if (!overdue || overdue.length === 0) return null;

  // Filter out already-answered and wrong-category questions
  for (const row of overdue) {
    if (excludeIds.includes(row.question_id)) continue;

    const { data: question } = await admin
      .from("questions")
      .select("*")
      .eq("id", row.question_id)
      .single();

    if (!question) continue;
    if (categoryIds && !categoryIds.includes(question.category_id)) continue;

    return mapQuestion(question);
  }

  return null;
}

async function getIRTQuestion(
  studentId: string,
  excludeIds: string[],
  categoryIds: string[] | null,
  admin: AdminClient
): Promise<SelectedQuestion | null> {
  // Get student abilities across all categories
  const { data: abilities } = await admin
    .from("student_ability")
    .select("category_id, theta, questions_seen")
    .eq("student_id", studentId);

  const abilityMap = new Map(
    (abilities ?? []).map((a) => [a.category_id, a])
  );

  // Get available categories
  let catQuery = admin.from("categories").select("id");
  if (categoryIds && categoryIds.length > 0) {
    catQuery = catQuery.in("id", categoryIds);
  }
  const { data: categories } = await catQuery;
  if (!categories || categories.length === 0) return null;

  // Sort categories: unseen first, then by theta ascending (weakest first)
  const sorted = categories.sort((a, b) => {
    const abilA = abilityMap.get(a.id);
    const abilB = abilityMap.get(b.id);
    const seenA = abilA?.questions_seen ?? 0;
    const seenB = abilB?.questions_seen ?? 0;

    // Unseen categories first
    if (seenA === 0 && seenB !== 0) return -1;
    if (seenB === 0 && seenA !== 0) return 1;

    // Then by theta ascending (weakest first)
    const thetaA = abilA?.theta ?? 0;
    const thetaB = abilB?.theta ?? 0;
    return thetaA - thetaB;
  });

  // Try each category until we find a question
  for (const cat of sorted) {
    const ability = abilityMap.get(cat.id);
    const theta = ability?.theta ?? 0;

    // Get candidate questions from this category
    const qQuery = admin
      .from("questions")
      .select("id, difficulty, discrimination, question_text, image_url, option_a, option_b, option_c, option_d, category_id")
      .eq("category_id", cat.id);

    const { data: questions } = await qQuery;
    if (!questions || questions.length === 0) continue;

    // Exclude already-answered questions
    const candidates = questions.filter((q) => !excludeIds.includes(q.id));
    if (candidates.length === 0) continue;

    // Select by maximum Fisher information
    const selected = selectByMaxInfo(
      theta,
      candidates.map((q) => ({
        id: q.id,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
      }))
    );

    if (!selected) continue;

    const full = candidates.find((q) => q.id === selected.id);
    if (!full) continue;

    return mapQuestion(full);
  }

  return null;
}

function mapQuestion(q: {
  id: string;
  question_text: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  category_id: string;
  difficulty: number;
  discrimination: number;
}): SelectedQuestion {
  return {
    id: q.id,
    questionText: q.question_text,
    imageUrl: q.image_url,
    optionA: q.option_a,
    optionB: q.option_b,
    optionC: q.option_c,
    optionD: q.option_d,
    categoryId: q.category_id,
    difficulty: q.difficulty,
    discrimination: q.discrimination,
  };
}

// ─── Answer Processing ────────────────────────────────────────

export interface AnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  newTheta: number;
}

/**
 * Process a student's answer: update IRT theta and spaced repetition schedule.
 * Called immediately in study mode, batch-called in exam mode on completion.
 */
export async function processAnswer(
  studentId: string,
  questionId: string,
  isCorrect: boolean,
  admin: AdminClient
): Promise<AnswerResult> {
  // Get question details
  const { data: question } = await admin
    .from("questions")
    .select("category_id, difficulty, discrimination, correct_answer")
    .eq("id", questionId)
    .single();

  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }

  // Get or create student ability for this category
  const { data: ability } = await admin
    .from("student_ability")
    .select("*")
    .eq("student_id", studentId)
    .eq("category_id", question.category_id)
    .single();

  const currentTheta = ability?.theta ?? 0;
  const questionsSeen = ability?.questions_seen ?? 0;
  const correctCount = ability?.correct_count ?? 0;

  // Update theta via IRT
  const newTheta = updateTheta(
    currentTheta,
    isCorrect,
    question.difficulty,
    question.discrimination,
    questionsSeen
  );

  // Upsert student_ability
  await admin.from("student_ability").upsert(
    {
      student_id: studentId,
      category_id: question.category_id,
      theta: newTheta,
      questions_seen: questionsSeen + 1,
      correct_count: correctCount + (isCorrect ? 1 : 0),
    },
    { onConflict: "student_id,category_id" }
  );

  console.info("[adaptive] theta updated", {
    studentId,
    category: question.category_id,
    oldTheta: currentTheta,
    newTheta,
    isCorrect,
  });

  // Update spaced repetition schedule
  const { data: existingReview } = await admin
    .from("review_schedule")
    .select("interval_days, ease_factor, repetitions")
    .eq("student_id", studentId)
    .eq("question_id", questionId)
    .single();

  const reviewState = existingReview
    ? {
        intervalDays: existingReview.interval_days,
        easeFactor: existingReview.ease_factor,
        repetitions: existingReview.repetitions,
      }
    : null;

  const review = computeReview(isCorrect, reviewState);

  await admin.from("review_schedule").upsert(
    {
      student_id: studentId,
      question_id: questionId,
      next_review_at: review.nextReviewAt.toISOString(),
      interval_days: review.intervalDays,
      ease_factor: review.easeFactor,
      repetitions: review.repetitions,
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: "student_id,question_id" }
  );

  return {
    isCorrect,
    correctAnswer: question.correct_answer,
    newTheta,
  };
}

// ─── Streak Update ────────────────────────────────────────────

/** Update streak when a student completes a session. Uses Philippine time (UTC+8). */
export async function updateStreak(
  studentId: string,
  admin: AdminClient
): Promise<void> {
  // Get current date in Philippine Standard Time (UTC+8)
  const now = new Date();
  const phtOffset = 8 * 60 * 60 * 1000;
  const phtDate = new Date(now.getTime() + phtOffset);
  const today = phtDate.toISOString().split("T")[0]; // YYYY-MM-DD

  const yesterday = new Date(phtDate.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: streak } = await admin
    .from("streaks")
    .select("*")
    .eq("student_id", studentId)
    .single();

  if (!streak) {
    // First ever session — create streak
    await admin.from("streaks").insert({
      student_id: studentId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
    });
    return;
  }

  if (streak.last_active_date === today) {
    // Already active today — no change
    return;
  }

  const newCurrent =
    streak.last_active_date === yesterday
      ? streak.current_streak + 1 // Consecutive day
      : 1; // Streak broken

  const newLongest = Math.max(streak.longest_streak, newCurrent);

  await admin
    .from("streaks")
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_active_date: today,
    })
    .eq("student_id", studentId);

  console.info("[adaptive] streak updated", {
    studentId,
    currentStreak: newCurrent,
  });
}
