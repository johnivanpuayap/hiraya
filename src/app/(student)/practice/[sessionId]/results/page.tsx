import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ResultsPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get session info
  const { data: session } = await supabase
    .from("sessions")
    .select("student_id, mode, question_count, correct_count, completed_at, started_at")
    .eq("id", sessionId)
    .single();

  if (!session || session.student_id !== user.id) {
    redirect("/practice");
  }

  // Get responses with question details
  const admin = createAdminClient();
  const { data: responses } = await admin
    .from("responses")
    .select("question_id, selected_answer, is_correct, time_spent_ms")
    .eq("session_id", sessionId)
    .order("answered_at", { ascending: true });

  // Get question details for each response
  const questionIds = (responses ?? []).map((r) => r.question_id);
  const { data: questions } = await admin
    .from("questions")
    .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer, category_id")
    .in("id", questionIds.length > 0 ? questionIds : ["__none__"]);

  // Get category names
  const categoryIds = [...new Set((questions ?? []).map((q) => q.category_id))];
  const { data: categories } = await admin
    .from("categories")
    .select("id, display_name")
    .in("id", categoryIds.length > 0 ? categoryIds : ["__none__"]);

  const questionMap = new Map((questions ?? []).map((q) => [q.id, q]));
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));

  const totalAnswered = responses?.length ?? 0;
  const correctCount = session.correct_count;
  const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const OPTION_LABELS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };
  function getOptionText(q: NonNullable<typeof questions>[number], key: string): string {
    const map: Record<string, string> = {
      a: q.option_a,
      b: q.option_b,
      c: q.option_c,
      d: q.option_d,
    };
    return map[key] ?? "";
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Results
      </h2>
      <p className="mt-1 text-text-secondary">
        {session.mode === "study" ? "Study" : "Exam"} session complete
      </p>

      {/* Score summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-text-secondary">Score</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            {score}%
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Correct</p>
          <p className="mt-1 font-heading text-3xl font-bold text-success">
            {correctCount}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Total</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            {totalAnswered}
          </p>
        </Card>
      </div>

      {/* Answer review */}
      <div className="mt-8 flex flex-col gap-4">
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Answer Review
        </h3>

        {(responses ?? []).map((response, index) => {
          const q = questionMap.get(response.question_id);
          if (!q) return null;

          const category = categoryMap.get(q.category_id);

          return (
            <Card key={response.question_id} padding="sm">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    response.is_correct ? "bg-success" : "bg-danger"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {q.question_text}
                  </p>
                  {category && (
                    <span className="mt-1 inline-block rounded-lg bg-surface px-2 py-0.5 text-xs text-text-secondary">
                      {category.display_name}
                    </span>
                  )}
                  <div className="mt-2 flex gap-4 text-xs">
                    <span className={response.is_correct ? "text-success" : "text-danger"}>
                      Your answer: {OPTION_LABELS[response.selected_answer ?? ""]}{" "}
                      — {response.selected_answer ? getOptionText(q, response.selected_answer) : "Skipped"}
                    </span>
                    {!response.is_correct && (
                      <span className="text-success">
                        Correct: {OPTION_LABELS[q.correct_answer]} — {getOptionText(q, q.correct_answer)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-3">
        <Link href="/practice">
          <Button>Practice Again</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
