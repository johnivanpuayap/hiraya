import { redirect, notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
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

  // Get session stats per student
  const studentStats = new Map<
    string,
    { sessions: number; avgScore: number }
  >();
  for (const studentId of studentIds) {
    const { data: sessions } = await admin
      .from("sessions")
      .select("correct_count, question_count")
      .eq("student_id", studentId)
      .not("completed_at", "is", null);

    const completed = sessions ?? [];
    const totalCorrect = completed.reduce((s, x) => s + x.correct_count, 0);
    const totalQuestions = completed.reduce(
      (s, x) => s + x.question_count,
      0
    );

    studentStats.set(studentId, {
      sessions: completed.length,
      avgScore:
        totalQuestions > 0
          ? Math.round((totalCorrect / totalQuestions) * 100)
          : 0,
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            {classData.name}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
            <span>Join Code:</span>
            <span className="rounded-lg bg-surface px-3 py-1 font-mono text-base font-bold text-accent">
              {classData.join_code}
            </span>
          </div>
        </div>
        <Link
          href="/t/classes"
          className="text-sm text-text-secondary hover:text-accent"
        >
          Back to Classes
        </Link>
      </div>

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
                <tr className="border-b border-surface text-text-secondary">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Sessions</th>
                  <th className="pb-2 font-medium">Avg Score</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {(members ?? []).map((member) => {
                  const profile = profileMap.get(member.student_id);
                  const stats = studentStats.get(member.student_id);

                  return (
                    <tr
                      key={member.student_id}
                      className="border-b border-surface/50"
                    >
                      <td className="py-3">
                        <Link
                          href={`/t/classes/${classId}/students/${member.student_id}`}
                          className="font-medium text-text-primary hover:text-accent"
                        >
                          {profile?.display_name ?? "Unknown"}
                        </Link>
                      </td>
                      <td className="py-3 text-text-secondary">
                        {stats?.sessions ?? 0}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {stats?.sessions ? `${stats.avgScore}%` : "\u2014"}
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
