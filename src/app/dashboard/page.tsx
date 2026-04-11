import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = getUserRole(user);
  if (!role) {
    redirect("/login");
  }

  if (role === "teacher") {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
}

function StudentDashboard(): React.JSX.Element {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Dashboard
      </h2>
      <p className="mt-1 text-text-secondary">
        Welcome to Hiraya! Your progress will appear here.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-text-secondary">Questions Answered</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Accuracy</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            &mdash;
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Current Streak</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0 days
          </p>
        </Card>
      </div>
    </div>
  );
}

function TeacherDashboard(): React.JSX.Element {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Dashboard
      </h2>
      <p className="mt-1 text-text-secondary">
        Manage your classes and track student progress.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-text-secondary">Total Classes</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Total Students</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0
          </p>
        </Card>
        <Card>
          <p className="text-sm text-text-secondary">Active Assignments</p>
          <p className="mt-1 font-heading text-3xl font-bold text-text-primary">
            0
          </p>
        </Card>
      </div>
    </div>
  );
}
