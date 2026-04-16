"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { useClassStore } from "@/stores/class-store";

export function ClassList(): React.ReactNode {
  const classes = useClassStore((s) => s.classes);
  const memberCounts = useClassStore((s) => s.memberCounts);

  if (classes.length === 0) {
    return (
      <Card className="mt-6">
        <p className="text-center text-text-secondary">
          No classes yet. Create one to get started.
        </p>
      </Card>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
      {classes.map((cls) => (
        <Link key={cls.id} href={`/classes/${cls.id}`}>
          <Card hover>
            <h3 className="font-heading text-lg font-bold text-text-primary">
              {cls.name}
            </h3>
            <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
              <span>{memberCounts[cls.id] ?? 0} students</span>
              <span className="rounded-lg glass px-2 py-0.5 font-mono text-xs">
                {cls.join_code}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
