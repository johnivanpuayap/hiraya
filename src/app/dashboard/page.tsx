import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { computeReadiness, getCategoryMastery } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";
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

function IconBarChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconStudent() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

async function TeacherDashboard({ userId }: { userId: string }) {
  const admin = createAdminClient();

  /* ── Fetch classes and assignments ── */
  const [classesResult, assignmentsResult] = await Promise.all([
    admin.from("classes").select("id, name").eq("teacher_id", userId),
    admin.from("assignments").select("id").eq("created_by", userId),
  ]);

  const classes = classesResult.data ?? [];
  const classIds = classes.map((c) => c.id);
  const safeClassIds = classIds.length > 0 ? classIds : ["__none__"];

  /* ── Fetch members, sessions, and profiles in parallel ── */
  const [membersResult, studentCountResult, sessionsResult] = await Promise.all([
    admin
      .from("class_members")
      .select("class_id, student_id")
      .in("class_id", safeClassIds),
    admin
      .from("class_members")
      .select("id", { count: "exact", head: true })
      .in("class_id", safeClassIds),
    admin
      .from("class_members")
      .select("student_id")
      .in("class_id", safeClassIds),
  ]);

  const members = membersResult.data ?? [];
  const studentCount = studentCountResult.count ?? 0;
  const allStudentIds = [
    ...new Set((sessionsResult.data ?? []).map((m) => m.student_id)),
  ];
  const safeStudentIds = allStudentIds.length > 0 ? allStudentIds : ["__none__"];

  /* ── Fetch completed sessions for all students in teacher's classes ── */
  const [completedSessionsResult, profilesResult] = await Promise.all([
    admin
      .from("sessions")
      .select("id, student_id, correct_count, question_count, completed_at")
      .in("student_id", safeStudentIds)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, display_name")
      .in("id", safeStudentIds),
  ]);

  const completedSessions = completedSessionsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  /* ── Compute avg class score ── */
  const totalScore = completedSessions.reduce(
    (sum, s) =>
      s.question_count > 0
        ? sum + (s.correct_count / s.question_count) * 100
        : sum,
    0,
  );
  const avgClassScore =
    completedSessions.length > 0
      ? Math.round(totalScore / completedSessions.length)
      : 0;

  /* ── Compute per-class stats ── */
  const classOverview = classes.map((cls) => {
    const classMembers = members.filter((m) => m.class_id === cls.id);
    const classMemberIds = classMembers.map((m) => m.student_id);
    const classSessions = completedSessions.filter((s) =>
      classMemberIds.includes(s.student_id),
    );
    const classTotal = classSessions.reduce(
      (sum, s) =>
        s.question_count > 0
          ? sum + (s.correct_count / s.question_count) * 100
          : sum,
      0,
    );
    const classAvg =
      classSessions.length > 0
        ? Math.round(classTotal / classSessions.length)
        : 0;

    return {
      id: cls.id,
      name: cls.name,
      studentCount: classMembers.length,
      avgScore: classAvg,
    };
  });

  /* ── Recent activity (last 10 completed sessions) ── */
  const recentActivity = completedSessions.slice(0, 10).map((s) => ({
    studentName: profileMap.get(s.student_id) ?? "Unknown Student",
    score:
      s.question_count > 0
        ? Math.round((s.correct_count / s.question_count) * 100)
        : 0,
    completedAt: s.completed_at as string,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your classes and track student progress.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Classes"
          value={classes.length}
          icon={<IconClasses />}
        />
        <StatCard
          label="Total Students"
          value={studentCount}
          icon={<IconStudent />}
        />
        <StatCard
          label="Active Assignments"
          value={assignmentsResult.data?.length ?? 0}
          icon={<IconClipboard />}
        />
        <StatCard
          label="Avg Class Score"
          value={completedSessions.length > 0 ? `${avgClassScore}%` : "\u2014"}
          icon={<IconBarChart />}
          subText={
            completedSessions.length > 0
              ? `across ${completedSessions.length} sessions`
              : "no completed sessions yet"
          }
        />
      </div>

      {/* Bottom row: Class Overview + Recent Activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Class Overview */}
        <Card className="lg:col-span-7">
          <h3 className="font-heading text-lg font-bold text-text-primary">
            Class Overview
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            Performance summary per class
          </p>
          {classes.length === 0 ? (
            <p className="mt-6 text-center text-sm text-text-muted">
              No classes yet. Create one to get started.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-glass text-text-muted">
                    <th className="pb-2 font-medium">Class</th>
                    <th className="pb-2 text-center font-medium">Students</th>
                    <th className="pb-2 text-center font-medium">Avg Score</th>
                    <th className="pb-2 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {classOverview.map((cls) => (
                    <tr
                      key={cls.id}
                      className="border-b border-glass/50 last:border-0"
                    >
                      <td className="py-3 font-medium text-text-primary">
                        {cls.name}
                      </td>
                      <td className="py-3 text-center text-text-secondary">
                        {cls.studentCount}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={
                            cls.avgScore >= 70
                              ? "font-semibold text-success"
                              : cls.avgScore >= 50
                                ? "font-semibold text-primary"
                                : "font-semibold text-danger"
                          }
                        >
                          {cls.studentCount > 0 ? `${cls.avgScore}%` : "\u2014"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <a
                          href={`/classes/${cls.id}`}
                          className="text-xs font-medium text-accent hover:text-primary transition-colors"
                        >
                          View &rarr;
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-5">
          <div className="flex items-center gap-2">
            <IconClock />
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Recent Activity
            </h3>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Last 10 completed sessions
          </p>
          {recentActivity.length === 0 ? (
            <p className="mt-6 text-center text-sm text-text-muted">
              No completed sessions yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentActivity.map((activity, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-glass/50 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {activity.studentName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatDate(activity.completedAt)}
                    </p>
                  </div>
                  <span
                    className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      activity.score >= 70
                        ? "bg-success/10 text-success"
                        : activity.score >= 50
                          ? "bg-[rgba(199,123,26,0.1)] text-primary"
                          : "bg-danger/10 text-danger"
                    }`}
                  >
                    {activity.score}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
