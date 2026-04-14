import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, mode, question_count, correct_count, started_at, completed_at")
    .eq("student_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="font-heading text-2xl font-bold text-text-primary">
        Profile
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Manage your account and review past sessions.
      </p>

      {/* Profile form */}
      <div className="mt-6">
        <ProfileForm />
      </div>

      {/* Session History */}
      <div className="mt-10">
        <h3 className="font-heading text-lg font-bold text-text-primary">
          Session History
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          Your recent practice and exam sessions
        </p>

        {(!sessions || sessions.length === 0) ? (
          <Card className="mt-4">
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9C876E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-sm text-text-secondary">
                No sessions yet. Start practicing to build your history.
              </p>
            </div>
          </Card>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {sessions.map((session) => {
              const score = session.question_count > 0
                ? Math.round((session.correct_count / session.question_count) * 100)
                : 0;
              const date = new Date(session.completed_at);
              const formattedDate = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedTime = date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              const scoreColor =
                score >= 70 ? "text-success" : score >= 40 ? "text-primary" : "text-danger";

              return (
                <Link
                  key={session.id}
                  href={`/practice/${session.id}/results`}
                  className="group flex items-center justify-between rounded-xl glass px-4 py-3 shadow-warm transition-all duration-200 hover:shadow-warm-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold ${scoreColor} bg-[rgba(199,123,26,0.06)]`}>
                      {score}%
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {session.mode === "study" ? "Study" : "Exam"} Session
                      </p>
                      <p className="text-xs text-text-muted">
                        {formattedDate} at {formattedTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm tabular-nums font-medium text-text-primary">
                        {session.correct_count}/{session.question_count}
                      </p>
                      <p className="text-xs text-text-muted">correct</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted transition-colors group-hover:text-primary">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
