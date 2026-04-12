import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";

interface QuestionsPageProps {
  searchParams: Promise<{ category?: string }>;
}

const OPTION_LABELS: Record<string, string> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

export default async function QuestionsPage({
  searchParams,
}: QuestionsPageProps) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  const admin = createAdminClient();

  // Get categories for filter
  const { data: categories } = await admin
    .from("categories")
    .select("id, display_name")
    .order("display_name");

  // Build category display name map
  const categoryNameMap = new Map<string, string>();
  for (const cat of categories ?? []) {
    categoryNameMap.set(cat.id, cat.display_name);
  }

  // Get questions with optional category filter
  let query = admin
    .from("questions")
    .select("*")
    .order("category_id")
    .order("difficulty");

  if (category) {
    query = query.eq("category_id", category);
  }

  const { data: questions } = await query;

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Question Bank
      </h2>
      <p className="mt-1 text-text-secondary">
        Browse all available PhilNITS questions.{" "}
        {questions?.length ?? 0} questions total.
      </p>

      {/* Category filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/questions"
          className={`rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
            !category
              ? "border-accent bg-accent/10 text-accent"
              : "border-glass text-text-secondary hover:border-accent/30"
          }`}
        >
          All
        </a>
        {(categories ?? []).map((cat) => (
          <a
            key={cat.id}
            href={`/questions?category=${cat.id}`}
            className={`rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
              category === cat.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-glass text-text-secondary hover:border-accent/30"
            }`}
          >
            {cat.display_name}
          </a>
        ))}
      </div>

      {/* Questions list */}
      <div className="mt-6 flex flex-col gap-4">
        {(questions ?? []).map((q, index) => {
          const options: Record<string, string> = {
            a: q.option_a,
            b: q.option_b,
            c: q.option_c,
            d: q.option_d,
          };

          return (
            <Card key={q.id} padding="sm">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg glass font-heading text-xs font-bold text-text-secondary">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {q.question_text}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-text-secondary">
                    {(["a", "b", "c", "d"] as const).map((key) => {
                      const isCorrect = key === q.correct_answer;
                      return (
                        <span
                          key={key}
                          className={
                            isCorrect ? "font-medium text-success" : ""
                          }
                        >
                          {OPTION_LABELS[key]}. {options[key]}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="rounded glass px-1.5 py-0.5 text-xs text-text-secondary">
                      {categoryNameMap.get(q.category_id) ?? "Unknown"}
                    </span>
                    <span className="rounded glass px-1.5 py-0.5 text-xs text-text-secondary">
                      {q.exam_source}
                    </span>
                    <span className="rounded glass px-1.5 py-0.5 text-xs text-text-secondary">
                      Difficulty: {q.difficulty.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
