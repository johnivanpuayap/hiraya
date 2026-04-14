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

/* ─── SVG Icons (Lucide-style, consistent 20×20 / stroke 2) ─── */

function IconTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A8E4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconClasses() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

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

  const { data: studentSessions } = await admin
    .from("sessions")
    .select("id")
    .eq("student_id", userId);

  const sessionIds = (studentSessions ?? []).map((s) => s.id);

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
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Track your progress and keep improving.
        </p>
      </div>

      {/* Top row: Readiness hero + Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Readiness Gauge — hero card */}
        <Card className="lg:col-span-4" padding="lg">
          <div className="flex h-full items-center justify-center">
            <ReadinessGauge readiness={readiness} />
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-8">
          <StatCard
            label="Questions Answered"
            value={totalAnswered}
            icon={<IconTarget />}
          />
          <StatCard
            label="Accuracy"
            value={totalAnswered > 0 ? `${accuracy}%` : "\u2014"}
            icon={<IconCheckCircle />}
          />
          <StatCard
            label="Sessions Completed"
            value={sessions.length}
            icon={<IconLayers />}
          />
          <div className="glass rounded-2xl p-5 shadow-warm">
            <StreakDisplay
              currentStreak={streak?.current_streak ?? 0}
              longestStreak={streak?.longest_streak ?? 0}
            />
          </div>
        </div>
      </div>

      {/* Bottom row: Mastery + Trend | Weak Topics */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:col-span-8">
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

        {/* Right column */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Focus Areas
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Topics below 70% mastery
            </p>
            <div className="mt-4">
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
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your classes and track student progress.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Total Classes"
          value={classesResult.data?.length ?? 0}
          icon={<IconClasses />}
        />
        <StatCard
          label="Total Students"
          value={studentCount ?? 0}
          icon={<IconClasses />}
        />
        <StatCard
          label="Active Assignments"
          value={assignmentsResult.data?.length ?? 0}
          icon={<IconClipboard />}
        />
      </div>
    </div>
  );
}
