import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getUserRoleWithFallback } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ClassesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRoleWithFallback(user, supabase);
  if (role !== "teacher") redirect("/dashboard");

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // Get member counts
  const admin = createAdminClient();
  const classIds = (classes ?? []).map((c) => c.id);
  const memberCounts = new Map<string, number>();

  if (classIds.length > 0) {
    for (const classId of classIds) {
      const { count } = await admin
        .from("class_members")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId);
      memberCounts.set(classId, count ?? 0);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-text-primary">
            Classes
          </h2>
          <p className="mt-1 text-text-secondary">
            Manage your classes and view student rosters.
          </p>
        </div>
        <Link href="/classes/new">
          <Button>Create Class</Button>
        </Link>
      </div>

      {!classes || classes.length === 0 ? (
        <Card className="mt-6">
          <p className="text-center text-text-secondary">
            No classes yet. Create one to get started.
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {classes.map((cls) => (
            <Link key={cls.id} href={`/classes/${cls.id}`}>
              <Card className="transition-shadow hover:shadow-warm-lg">
                <h3 className="font-heading text-lg font-bold text-text-primary">
                  {cls.name}
                </h3>
                <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
                  <span>{memberCounts.get(cls.id) ?? 0} students</span>
                  <span className="rounded-lg bg-surface px-2 py-0.5 font-mono text-xs">
                    {cls.join_code}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
