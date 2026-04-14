import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { getAuthenticatedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeReadiness, getCategoryMastery } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { MasteryChart } from "@/components/dashboard/mastery-chart";
import { ReadinessGauge } from "@/components/dashboard/readiness-gauge";
import { TrendGraph } from "@/components/dashboard/trend-graph";
import { WeakTopics } from "@/components/dashboard/weak-topics";

/* ─── SVG Icons (Lucide-style, 20×20 / stroke 2) ─── */

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

function IconFlame() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C77B1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

interface StudentDetailPageProps {
  params: Promise<{ classId: string; studentId: string }>;
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { classId, studentId } = await params;
  const { user, role, supabase } = await getAuthenticatedUser();

  if (!user) redirect("/login");

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
        .select("correct_count, question_count, started_at, mode, completed_at")
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

  const trendData = sessions.map((s) => ({
    date: s.started_at,
    score:
      s.question_count > 0
        ? Math.round((s.correct_count / s.question_count) * 100)
        : 0,
  }));

  const recentSessions = sessions.slice(0, 15);

  return (
    <div className="mx-auto max-w-6xl">
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

      {/* Top row: Readiness hero + Stats */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
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
            label="Sessions"
            value={sessions.length}
            icon={<IconLayers />}
          />
          <StatCard
            label="Streak"
            value={`${streak?.current_streak ?? 0} days`}
            icon={<IconFlame />}
          />
        </div>
      </div>

      {/* Middle row: Mastery + Trend | Weak Topics */}
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

      {/* Session History */}
      {recentSessions.length > 0 && (
        <div className="mt-6">
          <Card>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              Session History
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Last {recentSessions.length} completed sessions
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(199,123,26,0.15)] text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Mode</th>
                    <th className="pb-3 pr-4">Score</th>
                    <th className="pb-3 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((session, idx) => {
                    const pct =
                      session.question_count > 0
                        ? Math.round(
                            (session.correct_count / session.question_count) *
                              100
                          )
                        : 0;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-[rgba(199,123,26,0.08)] last:border-0"
                      >
                        <td className="py-2.5 pr-4 text-text-primary">
                          {formatDate(session.completed_at ?? session.started_at)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              session.mode === "exam"
                                ? "bg-[rgba(199,123,26,0.12)] text-accent"
                                : "bg-[rgba(90,142,76,0.12)] text-success"
                            }`}
                          >
                            {session.mode === "exam" ? "Exam" : "Study"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-text-secondary">
                          {session.correct_count}/{session.question_count}
                        </td>
                        <td className="py-2.5 text-right font-medium text-text-primary">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
