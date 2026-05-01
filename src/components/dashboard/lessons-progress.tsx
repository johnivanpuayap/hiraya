import Link from "next/link";

import { Card } from "@/components/ui/card";

interface LessonsProgressProps {
  lessonsRead: number;
  totalLessons: number;
  nextLessonHref: string | null;
  nextLessonTitle: string | null;
}

export function LessonsProgress({
  lessonsRead,
  totalLessons,
  nextLessonHref,
  nextLessonTitle,
}: LessonsProgressProps): React.JSX.Element {
  const hasLessons = totalLessons > 0;
  const percent = hasLessons
    ? Math.min(100, Math.round((lessonsRead / totalLessons) * 100))
    : 0;
  const isComplete = hasLessons && lessonsRead >= totalLessons;
  const barColor = isComplete ? "bg-success" : "bg-primary-gradient";

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        Reading Progress
      </p>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-heading text-3xl text-text-primary">
          {lessonsRead}
        </span>
        <span className="text-text-secondary"> / {totalLessons}</span>
        <span className="text-sm text-text-muted">lessons read</span>
      </div>

      {hasLessons ? (
        <div
          className="mt-4 h-2 w-full rounded-full bg-[rgba(199,123,26,0.1)]"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lessons read"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          No lessons available yet.
        </p>
      )}

      <div className="mt-4">
        {nextLessonHref && nextLessonTitle ? (
          <Link
            href={nextLessonHref}
            className="text-xs font-medium text-accent transition-colors hover:text-primary"
          >
            Continue: {nextLessonTitle} &rarr;
          </Link>
        ) : (
          <Link
            href="/learn"
            className="text-xs font-medium text-accent transition-colors hover:text-primary"
          >
            Browse all lessons &rarr;
          </Link>
        )}
      </div>
    </Card>
  );
}
