import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { Card } from "@/components/ui/card";

interface LessonRow {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  order_index: number;
  estimated_minutes: number | null;
}

interface CategoryRow {
  id: string;
  name: string;
  display_name: string;
}

interface LessonGroup {
  category: CategoryRow;
  lessons: LessonRow[];
}

interface QuizBest {
  bestScorePct: number;
  passed: boolean;
}

export default async function LearnPage(): Promise<React.JSX.Element> {
  const { user, role } = await getAuthenticatedUser();

  if (!user) redirect("/login");
  if (role !== "student") redirect("/dashboard");

  const admin = createAdminClient();

  const [lessonsResult, categoriesResult, readsResult] = await Promise.all([
    admin
      .from("lessons")
      .select("id, category_id, slug, title, order_index, estimated_minutes")
      .is("deleted_at", null)
      .order("category_id", { ascending: true })
      .order("order_index", { ascending: true }),
    admin.from("categories").select("id, name, display_name"),
    admin.from("lesson_reads").select("lesson_id").eq("user_id", user.id),
  ]);

  const lessons = lessonsResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const reads = readsResult.data ?? [];
  const readLessonIds = new Set(reads.map((r) => r.lesson_id));

  const lessonIds = lessons.map((l) => l.id);
  const quizAttemptsResult =
    lessonIds.length > 0
      ? await admin
          .from("lesson_quiz_attempts")
          .select("lesson_id, correct_count, total_count, passed")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds)
      : { data: [] };
  const quizAttempts = quizAttemptsResult.data ?? [];

  const bestQuizByLessonId = new Map<string, QuizBest>();
  for (const attempt of quizAttempts) {
    if (attempt.total_count <= 0) continue;
    const ratio = attempt.correct_count / attempt.total_count;
    const scorePct = Math.round(ratio * 100);
    const existing = bestQuizByLessonId.get(attempt.lesson_id);
    if (existing) {
      existing.bestScorePct = Math.max(existing.bestScorePct, scorePct);
      existing.passed = existing.passed || attempt.passed;
    } else {
      bestQuizByLessonId.set(attempt.lesson_id, {
        bestScorePct: scorePct,
        passed: attempt.passed,
      });
    }
  }

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const groupsByCategoryId = new Map<string, LessonGroup>();
  for (const lesson of lessons) {
    const category = categoriesById.get(lesson.category_id);
    if (!category) continue;

    let group = groupsByCategoryId.get(category.id);
    if (!group) {
      group = { category, lessons: [] };
      groupsByCategoryId.set(category.id, group);
    }
    group.lessons.push(lesson);
  }

  const groups = Array.from(groupsByCategoryId.values()).sort((a, b) =>
    a.category.display_name.localeCompare(b.category.display_name)
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          Learn
        </h2>
        <p className="mt-1 text-text-secondary">
          Build your foundations one short lesson at a time.
        </p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <h3 className="font-heading text-text-primary">
            No lessons brewing yet.
          </h3>
          <p className="mt-1 text-text-secondary">
            Check back soon — or hop into{" "}
            <Link
              href="/practice"
              className="text-accent underline underline-offset-2 hover:opacity-80"
            >
              Practice
            </Link>{" "}
            to keep your streak warm.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.category.id}>
              <h3 className="font-heading text-lg font-bold text-text-primary">
                {group.category.display_name}
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {group.lessons.map((lesson) => {
                  const isRead = readLessonIds.has(lesson.id);
                  const quizBest = bestQuizByLessonId.get(lesson.id);
                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${lesson.slug}`}
                      className="block"
                    >
                      <Card hover>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading text-base font-bold text-text-primary">
                              {lesson.title}
                            </h4>
                            <p className="mt-1 text-xs text-text-muted">
                              {group.category.display_name}
                              {lesson.estimated_minutes !== null
                                ? ` · ${lesson.estimated_minutes} min`
                                : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {isRead ? (
                              <span
                                aria-label="Lesson read"
                                className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success"
                              >
                                ✓ Read
                              </span>
                            ) : null}
                            {quizBest ? (
                              quizBest.passed ? (
                                <span
                                  aria-label={`Best quiz score ${quizBest.bestScorePct}%, passed`}
                                  className="rounded-full bg-success px-2.5 py-0.5 text-xs font-semibold text-white"
                                >
                                  {quizBest.bestScorePct}%
                                </span>
                              ) : (
                                <span
                                  aria-label={`Best quiz score ${quizBest.bestScorePct}%`}
                                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                                >
                                  {quizBest.bestScorePct}%
                                </span>
                              )
                            ) : null}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
