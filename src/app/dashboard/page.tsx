import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { computeReadiness, getCategoryMastery } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { MasteryChart } from "@/components/dashboard/mastery-chart";
import { ReadinessGauge } from "@/components/dashboard/readiness-gauge";
import { StreakDisplay } from "@/components/dashboard/streak-display";
import { WeakTopics } from "@/components/dashboard/weak-topics";
import { TrendGraph } from "@/components/dashboard/trend-graph";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (!role) redirect("/login");

  if (role === "teacher") {
    return <TeacherDashboard userId={user.id} />;
  }

  return <StudentDashboard userId={user.id} />;
}

async function StudentDashboard({ userId }: { userId: string }) {
  const admin = createAdminClient();

  // First get session IDs for this student (needed by responses count)
  const { data: studentSessions } = await admin
    .from("sessions")
    .select("id")
    .eq("student_id", userId);

  const sessionIds = (studentSessions ?? []).map((s) => s.id);

  // Fetch all data in parallel
  const [abilitiesResult, categoriesResult, streakResult, sessionsResult, responsesCount] =
    await Promise.all([
      admin.from("student_ability").select("*").eq("student_id", userId),
      admin.from("categories").select("id, display_name, exam_weight"),
      admin.from("streaks").select("*").eq("student_id", userId).single(),
      admin
        .from("sessions")
        .select("correct_count, question_count, started_at, completed_at")
        .eq("student_id", userId)
        .not("completed_at", "is", null)
        .order("started_at", { ascending: false })
        .limit(20),
      admin
        .from("responses")
        .select("id", { count: "exact", head: true })
        .in("session_id", sessionIds.length > 0 ? sessionIds : ["__none__"]),
    ]);

  const abilities = abilitiesResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const streak = streakResult.data;
  const sessions = sessionsResult.data ?? [];
  const totalAnswered = responsesCount.count ?? 0;

  // Compute analytics
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

  const totalCorrect = abilities.reduce((sum, a) => sum + a.correct_count, 0);
  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  const trendData = sessions.map((s) => ({
    date: s.started_at,
    score:
      s.question_count > 0
        ? Math.round((s.correct_count / s.question_count) * 100)
        : 0,
  }));

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Dashboard
      </h2>
      <p className="mt-1 text-text-secondary">
        Track your progress and keep improving.
      </p>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Questions Answered" value={totalAnswered} />
        <StatCard
          label="Accuracy"
          value={totalAnswered > 0 ? `${accuracy}%` : "\u2014"}
        />
        <StatCard
          label="Sessions Completed"
          value={sessions.length}
        />
        <div className="flex items-center glass rounded-2xl p-6 shadow-warm">
          <StreakDisplay
            currentStreak={streak?.current_streak ?? 0}
            longestStreak={streak?.longest_streak ?? 0}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Mastery + Trend */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Category Mastery
            </h3>
            <div className="mt-4">
              <MasteryChart categories={mastery} />
            </div>
          </Card>

          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Score Trend
            </h3>
            <div className="mt-4">
              <TrendGraph sessions={trendData} />
            </div>
          </Card>
        </div>

        {/* Right: Readiness + Weak Topics */}
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex justify-center py-2">
              <ReadinessGauge readiness={readiness} />
            </div>
          </Card>

          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Weak Topics
            </h3>
            <div className="mt-3">
              <WeakTopics topics={mastery} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

async function TeacherDashboard({ userId }: { userId: string }) {
  const admin = createAdminClient();

  const [classesResult, assignmentsResult] = await Promise.all([
    admin.from("classes").select("id").eq("teacher_id", userId),
    admin.from("assignments").select("id").eq("created_by", userId),
  ]);

  const classIds = (classesResult.data ?? []).map((c) => c.id);
  const { count: studentCount } = await admin
    .from("class_members")
    .select("id", { count: "exact", head: true })
    .in("class_id", classIds.length > 0 ? classIds : ["__none__"]);

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Dashboard
      </h2>
      <p className="mt-1 text-text-secondary">
        Manage your classes and track student progress.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Classes" value={classesResult.data?.length ?? 0} />
        <StatCard label="Total Students" value={studentCount ?? 0} />
        <StatCard
          label="Active Assignments"
          value={assignmentsResult.data?.length ?? 0}
        />
      </div>
    </div>
  );
}
