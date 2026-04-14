import { redirect } from "next/navigation";
import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";

interface QuestionsPageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

const OPTION_LABELS: Record<string, string> = {
  a: "A",
  b: "B",
  c: "C",
  d: "D",
};

const PAGE_SIZE = 25;

export default async function QuestionsPage({
  searchParams,
}: QuestionsPageProps) {
  const { category, page: pageParam } = await searchParams;
  const { user, role } = await getAuthenticatedUser();

  if (!user) redirect("/login");
  if (role !== "teacher") redirect("/dashboard");

  const admin = createAdminClient();
  const currentPage = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Fetch categories and questions in parallel
  const [{ data: categories }, questionsResult] = await Promise.all([
    admin.from("categories").select("id, display_name").order("display_name"),
    (() => {
      let query = admin
        .from("questions")
        .select("*", { count: "exact" })
        .order("category_id")
        .order("difficulty")
        .range(offset, offset + PAGE_SIZE - 1);

      if (category) {
        query = query.eq("category_id", category);
      }

      return query;
    })(),
  ]);

  const questions = questionsResult.data ?? [];
  const totalCount = questionsResult.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const categoryNameMap = new Map<string, string>();
  for (const cat of categories ?? []) {
    categoryNameMap.set(cat.id, cat.display_name);
  }

  function buildUrl(params: { category?: string; page?: number }) {
    const parts: string[] = [];
    if (params.category) parts.push(`category=${params.category}`);
    if (params.page && params.page > 1) parts.push(`page=${params.page}`);
    return `/questions${parts.length > 0 ? `?${parts.join("&")}` : ""}`;
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Question Bank
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        {totalCount} questions{category ? ` in ${categoryNameMap.get(category) ?? "this category"}` : " total"}
      </p>

      {/* Category filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/questions"
          className={`rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
            !category
              ? "border-accent bg-accent/10 text-accent"
              : "border-glass text-text-secondary hover:border-accent/30"
          }`}
        >
          All
        </Link>
        {(categories ?? []).map((cat) => (
          <Link
            key={cat.id}
            href={buildUrl({ category: cat.id })}
            className={`rounded-xl border-2 px-3 py-1.5 text-xs font-medium transition-colors ${
              category === cat.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-glass text-text-secondary hover:border-accent/30"
            }`}
          >
            {cat.display_name}
          </Link>
        ))}
      </div>

      {/* Questions list */}
      <div className="mt-6 flex flex-col gap-4">
        {questions.map((q, index) => {
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
                  {offset + index + 1}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Link
              href={buildUrl({ category, page: currentPage - 1 })}
              className="rounded-xl border-2 border-glass px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent/30 transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-text-muted">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={buildUrl({ category, page: currentPage + 1 })}
              className="rounded-xl border-2 border-glass px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent/30 transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
