import { Card } from "@/components/ui/card";

export default function StudentDashboard() {
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
            —
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
