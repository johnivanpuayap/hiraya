import { redirect } from "next/navigation";
import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ClassStoreHydrator } from "@/components/hydrators/class-store-hydrator";
import { ClassList } from "./class-list";

export default async function ClassesPage() {
  const { user, role } = await getAuthenticatedUser();

  if (!user) redirect("/login");
  if (role !== "teacher") redirect("/dashboard");

  const admin = createAdminClient();

  const { data: classes } = await admin
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  // Get member counts in parallel
  const classIds = (classes ?? []).map((c) => c.id);
  const memberCounts: Record<string, number> = {};

  if (classIds.length > 0) {
    const results = await Promise.all(
      classIds.map((classId) =>
        admin
          .from("class_members")
          .select("id", { count: "exact", head: true })
          .eq("class_id", classId)
          .then(({ count }) => [classId, count ?? 0] as const)
      )
    );
    for (const [id, count] of results) {
      memberCounts[id] = count;
    }
  }

  return (
    <div>
      <ClassStoreHydrator classes={classes ?? []} memberCounts={memberCounts} />
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

      <ClassList />
    </div>
  );
}
