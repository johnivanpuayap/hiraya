import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  // Fetch assignments and classes separately to avoid join typing issues
  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  // Fetch class names for display
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
            <Card key={a.id}>
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
                <span className="rounded-lg bg-surface px-2 py-1 text-xs text-text-secondary">
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
