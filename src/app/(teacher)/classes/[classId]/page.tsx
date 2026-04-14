import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { MasteryChart } from "@/components/dashboard/mastery-chart";
import { computeReadiness, thetaToMastery } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

interface ClassDetailPageProps {
  params: Promise<{ classId: string }>;
}

export default async function ClassDetailPage({
  params,
}: ClassDetailPageProps) {
  const { classId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  // Get class info
  const { data: classData } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .single();

  if (!classData) notFound();

  const admin = createAdminClient();

  // Get members with profile info
  const { data: members } = await admin
    .from("class_members")
    .select("student_id, joined_at")
    .eq("class_id", classId);

  const studentIds = (members ?? []).map((m) => m.student_id);
  const { data: profiles } =
    studentIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", studentIds)
      : { data: [] as Array<{ id: string; display_name: string | null }> };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Get all categories for readiness computation
  const { data: categories } = await admin
    .from("categories")
    .select("id, display_name, exam_weight");

  const allCategories = categories ?? [];

  // Get student_ability data for all students in the class
  const { data: allAbilities } =
    studentIds.length > 0
      ? await admin
          .from("student_ability")
          .select("student_id, category_id, theta, questions_seen, correct_count")
          .in("student_id", studentIds)
      : { data: [] as Array<{
          student_id: string;
          category_id: string;
          theta: number;
          questions_seen: number;
          correct_count: number;
        }> };

  const abilityRows = allAbilities ?? [];

  // Build ability map per student
  const abilityByStudent = new Map<
    string,
    Array<{
      categoryId: string;
      theta: number;
      questionsSeen: number;
      correctCount: number;
      examWeight: number;
      displayName: string;
    }>
  >();

  for (const studentId of studentIds) {
    const studentAbilities = allCategories.map((cat) => {
      const row = abilityRows.find(
        (a) => a.student_id === studentId && a.category_id === cat.id
      );
      return {
        categoryId: cat.id as string,
        theta: row?.theta ?? 0,
        questionsSeen: row?.questions_seen ?? 0,
        correctCount: row?.correct_count ?? 0,
        examWeight: cat.exam_weight as number,
        displayName: cat.display_name as string,
      };
    });
    abilityByStudent.set(studentId, studentAbilities);
  }

  // Get session stats per student (completed sessions + last active)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const studentStats = new Map<
    string,
    {
      sessions: number;
      avgScore: number;
      readiness: number;
      lastActive: string | null;
      activeThisWeek: boolean;
    }
  >();

  let totalSessions = 0;
  let activeThisWeekCount = 0;
  let scoreSum = 0;
  let studentsWithSessions = 0;

  for (const studentId of studentIds) {
    const { data: sessions } = await admin
      .from("sessions")
      .select("correct_count, question_count, completed_at")
      .eq("student_id", studentId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    const completed = sessions ?? [];
    const totalCorrect = completed.reduce((s, x) => s + x.correct_count, 0);
    const totalQuestions = completed.reduce(
      (s, x) => s + x.question_count,
      0
    );
    const avgScore =
      totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

    const lastActive = completed.length > 0 ? completed[0].completed_at : null;
    const activeThisWeek = completed.some(
      (s) => s.completed_at && s.completed_at >= sevenDaysAgoISO
    );

    const abilities = abilityByStudent.get(studentId) ?? [];
    const readiness = computeReadiness(abilities);

    totalSessions += completed.length;
    if (completed.length > 0) {
      studentsWithSessions++;
      scoreSum += avgScore;
    }
    if (activeThisWeek) activeThisWeekCount++;

    studentStats.set(studentId, {
      sessions: completed.length,
      avgScore,
      readiness,
      lastActive,
      activeThisWeek,
    });
  }

  const classAvgScore =
    studentsWithSessions > 0
      ? Math.round(scoreSum / studentsWithSessions)
      : 0;

  // Aggregate class-level mastery per category
  const classMastery = allCategories.map((cat) => {
    let masterySum = 0;
    let studentCount = 0;
    let totalQuestionsSeen = 0;

    for (const studentId of studentIds) {
      const row = abilityRows.find(
        (a) => a.student_id === studentId && a.category_id === cat.id
      );
      if (row && row.questions_seen > 0) {
        masterySum += thetaToMastery(row.theta);
        studentCount++;
        totalQuestionsSeen += row.questions_seen;
      }
    }

    return {
      displayName: cat.display_name as string,
      mastery: studentCount > 0 ? Math.round(masterySum / studentCount) : 0,
      questionsSeen: totalQuestionsSeen,
    };
  });

  // Sort students by readiness (lowest first) so struggling students appear at top
  const sortedMembers = [...(members ?? [])].sort((a, b) => {
    const readinessA = studentStats.get(a.student_id)?.readiness ?? 0;
    const readinessB = studentStats.get(b.student_id)?.readiness ?? 0;
    return readinessA - readinessB;
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            {classData.name}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
            <span>Join Code:</span>
            <span className="rounded-lg glass px-3 py-1 font-mono text-base font-bold text-accent">
              {classData.join_code}
            </span>
          </div>
        </div>
        <Link
          href="/classes"
          className="text-sm text-text-secondary hover:text-accent"
        >
          Back to Classes
        </Link>
      </div>

      {/* Stats Row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={studentIds.length}
          icon={
            <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Avg Score"
          value={studentsWithSessions > 0 ? `${classAvgScore}%` : "\u2014"}
          icon={
            <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          }
          subText={studentsWithSessions > 0 ? `across ${studentsWithSessions} active` : undefined}
        />
        <StatCard
          label="Total Sessions"
          value={totalSessions}
          icon={
            <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          }
        />
        <StatCard
          label="Active This Week"
          value={activeThisWeekCount}
          icon={
            <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          subText={
            studentIds.length > 0
              ? `${Math.round((activeThisWeekCount / studentIds.length) * 100)}% of class`
              : undefined
          }
        />
      </div>

      {/* Class Mastery Section */}
      {allCategories.length > 0 && studentIds.length > 0 && (
        <Card className="mt-6">
          <h3 className="font-heading text-lg font-bold text-text-primary">
            Class Mastery
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Average mastery across all students per category
          </p>
          <div className="mt-4">
            <MasteryChart categories={classMastery} />
          </div>
        </Card>
      )}

      {/* Student Table */}
      <Card className="mt-6">
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Students ({studentIds.length})
        </h3>

        {studentIds.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">
            No students yet. Share the join code to invite students.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-glass text-text-secondary">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Readiness</th>
                  <th className="pb-2 font-medium">Sessions</th>
                  <th className="pb-2 font-medium">Avg Score</th>
                  <th className="pb-2 font-medium">Last Active</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member) => {
                  const profile = profileMap.get(member.student_id);
                  const stats = studentStats.get(member.student_id);
                  const readiness = stats?.readiness ?? 0;
                  const readinessColor =
                    readiness >= 70
                      ? "text-success"
                      : readiness >= 40
                        ? "text-primary"
                        : "text-danger";

                  return (
                    <tr
                      key={member.student_id}
                      className="border-b border-glass/50"
                    >
                      <td className="py-3">
                        <Link
                          href={`/classes/${classId}/students/${member.student_id}`}
                          className="font-medium text-text-primary hover:text-accent"
                        >
                          {profile?.display_name ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className={`font-semibold ${readinessColor}`}>
                          {stats?.sessions ? `${readiness}%` : "\u2014"}
                        </span>
                      </td>
                      <td className="py-3 text-text-secondary">
                        {stats?.sessions ?? 0}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {stats?.sessions ? `${stats.avgScore}%` : "\u2014"}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {stats?.lastActive
                          ? formatDate(stats.lastActive)
                          : "\u2014"}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {formatDate(member.joined_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
