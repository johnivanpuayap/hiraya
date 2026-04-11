import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { computeReadiness, getCategoryMastery } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { MasteryChart } from "@/components/dashboard/mastery-chart";
import { ReadinessGauge } from "@/components/dashboard/readiness-gauge";

interface StudentDetailPageProps {
  params: Promise<{ classId: string; studentId: string }>;
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { classId, studentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  // Verify teacher owns this class
  const { data: classData } = await supabase
    .from("classes")
    .select("name, teacher_id")
    .eq("id", classId)
    .single();

  if (!classData || classData.teacher_id !== user.id) notFound();

  const admin = createAdminClient();

  // Get student profile
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", studentId)
    .single();

  if (!profile) notFound();

  // Get student data
  const [abilitiesResult, categoriesResult, streakResult, sessionsResult] =
    await Promise.all([
      admin.from("student_ability").select("*").eq("student_id", studentId),
      admin.from("categories").select("id, display_name, exam_weight"),
      admin.from("streaks").select("*").eq("student_id", studentId).single(),
      admin
        .from("sessions")
        .select("correct_count, question_count, completed_at")
        .eq("student_id", studentId)
        .not("completed_at", "is", null)
        .order("started_at", { ascending: false }),
    ]);

  const abilities = abilitiesResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const streak = streakResult.data;
  const sessions = sessionsResult.data ?? [];

  const categoryAbilities = categories.map((cat) => {
    const ability = abilities.find((a) => a.category_id === cat.id);
    return {
      categoryId: cat.id,
      theta: ability?.theta ?? 0,
      questionsSeen: ability?.questions_seen ?? 0,
      correctCount: ability?.correct_count ?? 0,
      examWeight: cat.exam_weight,
      displayName: cat.display_name,
    };
  });

  const readiness = computeReadiness(categoryAbilities);
  const mastery = getCategoryMastery(categoryAbilities);

  const totalAnswered = abilities.reduce((s, a) => s + a.questions_seen, 0);
  const totalCorrect = abilities.reduce((s, a) => s + a.correct_count, 0);
  const accuracy =
    totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0;

  return (
    <div>
      <p className="text-sm text-text-secondary">
        <Link href="/classes" className="hover:text-accent">
          Classes
        </Link>
        {" \u203A "}
        <Link href={`/classes/${classId}`} className="hover:text-accent">
          {classData.name}
        </Link>
        {" \u203A Student"}
      </p>
      <h2 className="mt-1 font-heading text-2xl font-bold text-text-primary">
        {profile.display_name}
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Questions Answered" value={totalAnswered} />
        <StatCard
          label="Accuracy"
          value={totalAnswered > 0 ? `${accuracy}%` : "\u2014"}
        />
        <StatCard label="Sessions" value={sessions.length} />
        <StatCard
          label="Streak"
          value={`${streak?.current_streak ?? 0} days`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Category Mastery
            </h3>
            <div className="mt-4">
              <MasteryChart categories={mastery} />
            </div>
          </Card>
        </div>
        <Card>
          <div className="flex justify-center py-2">
            <ReadinessGauge readiness={readiness} />
          </div>
        </Card>
      </div>
    </div>
  );
}
