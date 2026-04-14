import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (!role) redirect("/login");

  if (role === "teacher") {
    return <TeacherAssignments userId={user.id} />;
  }

  return <StudentAssignments userId={user.id} />;
}

async function StudentAssignments({ userId }: { userId: string }) {
  const admin = createAdminClient();

  const { data: memberships } = await admin
    .from("class_members")
    .select("class_id")
    .eq("student_id", userId);

  const classIds = (memberships ?? []).map((m) => m.class_id);

  const { data: assignments } =
    classIds.length > 0
      ? await admin
          .from("assignments")
          .select("*")
          .in("class_id", classIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const uniqueClassIds = [
    ...new Set((assignments ?? []).map((a) => a.class_id)),
  ];
  const { data: classes } =
    uniqueClassIds.length > 0
      ? await admin.from("classes").select("id, name").in("id", uniqueClassIds)
      : { data: [] };

  const classNameMap = new Map(
    (classes ?? []).map((c) => [c.id, c.name])
  );

  const { data: sessions } = await admin
    .from("sessions")
    .select("assignment_id, completed_at, correct_count, question_count")
    .eq("student_id", userId)
    .not("assignment_id", "is", null);

  const sessionsByAssignment = new Map(
    (sessions ?? []).map((s) => [s.assignment_id, s])
  );

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Assignments
      </h2>
      <p className="mt-1 text-text-secondary">
        Practice sets assigned by your teachers.
      </p>

      {!assignments || assignments.length === 0 ? (
        <Card className="mt-6">
          <p className="text-center text-text-secondary">
            {classIds.length > 0
              ? "No assignments yet. Your teacher hasn\u2019t created any assignments."
              : "No assignments yet. Join a class to receive assignments."}
          </p>
          {classIds.length === 0 && (
            <div className="mt-4 flex justify-center">
              <Link href="/classes/join">
                <Button variant="secondary">Join a Class</Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {assignments.map((assignment) => {
            const session = sessionsByAssignment.get(assignment.id);
            const isComplete = !!session?.completed_at;
            const score =
              session && session.question_count > 0
                ? Math.round(
                    (session.correct_count / session.question_count) * 100
                  )
                : null;

            const isOverdue =
              assignment.deadline &&
              new Date(assignment.deadline) < new Date() &&
              !isComplete;

            return (
              <Card key={assignment.id} hover>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-base font-bold text-text-primary">
                      {assignment.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {classNameMap.get(assignment.class_id) ?? "Unknown class"}{" "}
                      · {assignment.question_count} questions ·{" "}
                      {assignment.mode}
                    </p>
                    {assignment.deadline && (
                      <p
                        className={`mt-1 text-xs ${isOverdue ? "font-medium text-danger" : "text-text-secondary"}`}
                      >
                        {isOverdue ? "Overdue" : "Due"}:{" "}
                        {new Date(assignment.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {isComplete ? (
                      <span className="inline-block rounded-lg bg-success/10 px-2 py-1 text-xs font-medium text-success">
                        {score}%
                      </span>
                    ) : (
                      <Link href={`/practice?assignment=${assignment.id}`}>
                        <Button size="sm">Start</Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function TeacherAssignments({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  const classIds = [
    ...new Set((assignments ?? []).map((a) => a.class_id)),
  ];
  const classNameMap = new Map<string, string>();

  if (classIds.length > 0) {
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .in("id", classIds);

    for (const cls of classes ?? []) {
      classNameMap.set(cls.id, cls.name);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            Assignments
          </h2>
          <p className="mt-1 text-text-secondary">
            Create and manage practice assignments for your classes.
          </p>
        </div>
        <Link href="/assignments/new">
          <Button>Create Assignment</Button>
        </Link>
      </div>

      {!assignments || assignments.length === 0 ? (
        <Card className="mt-6">
          <p className="text-center text-text-secondary">
            No assignments yet. Create one for your class.
          </p>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {assignments.map((a) => (
            <Card key={a.id} hover>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-base font-bold text-text-primary">
                    {a.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {classNameMap.get(a.class_id) ?? "Unknown"} &middot;{" "}
                    {a.question_count} questions &middot; {a.mode}
                  </p>
                  {a.deadline && (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      Due: {formatDate(a.deadline)}
                    </p>
                  )}
                </div>
                <span className="rounded-lg glass border border-glass px-2 py-1 text-xs text-text-secondary">
                  {formatDate(a.created_at)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
