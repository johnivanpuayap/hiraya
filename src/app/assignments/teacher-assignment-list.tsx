"use client";

import { Card } from "@/components/ui/card";
import { useAssignmentStore } from "@/stores/assignment-store";
import { formatDate } from "@/lib/utils";

export function TeacherAssignmentList(): React.ReactNode {
  const assignments = useAssignmentStore((s) => s.assignments);
  const classNameMap = useAssignmentStore((s) => s.classNameMap);

  if (assignments.length === 0) {
    return (
      <Card className="mt-6">
        <p className="text-center text-text-secondary">
          No assignments yet. Create one for your class.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {assignments.map((a) => (
        <Card key={a.id} hover>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-heading text-base font-bold text-text-primary">
                {a.title}
              </h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                {classNameMap[a.class_id] ?? "Unknown"} &middot;{" "}
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
  );
}
