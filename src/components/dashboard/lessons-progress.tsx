import Link from "next/link";

import { Card } from "@/components/ui/card";

interface LessonsProgressProps {
  lessonsRead: number;
  totalLessons: number;
  nextLessonHref: string | null;
  nextLessonTitle: string | null;
}

function IconBook(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C77B1A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function progressBarClass(percent: number, isComplete: boolean): string {
  if (isComplete) return "bg-success";
  if (percent >= 75) return "bg-gradient-to-r from-primary to-success";
  return "bg-primary-gradient";
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
  const isEmpty = hasLessons && lessonsRead === 0;
  const barColor = progressBarClass(percent, isComplete);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <IconBook />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Reading Progress
        </p>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-heading text-3xl text-text-primary">
          {lessonsRead}
        </span>
        <span className="text-text-secondary"> / {totalLessons}</span>
        <span className="text-sm text-text-muted">lessons read</span>
      </div>

      {hasLessons ? (
        <div
          className="mt-4 h-2 w-full rounded-full bg-primary/10"
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

      {isComplete ? (
        <p className="mt-3 text-sm text-success">
          You&apos;ve read every lesson — great work.
        </p>
      ) : null}

      <div className="mt-auto pt-4">
        {isEmpty ? (
          <Link
            href={nextLessonHref ?? "/learn"}
            className="text-xs font-medium text-accent transition-colors hover:text-primary"
          >
            Start your first lesson &rarr;
          </Link>
        ) : nextLessonHref && nextLessonTitle ? (
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
