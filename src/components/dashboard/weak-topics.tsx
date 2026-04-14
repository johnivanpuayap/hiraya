import Link from "next/link";

interface WeakTopicsProps {
  topics: Array<{
    categoryId: string;
    displayName: string;
    mastery: number;
  }>;
}

export function WeakTopics({ topics }: WeakTopicsProps) {
  const weak = topics.filter((t) => t.mastery < 70).slice(0, 5);

  if (weak.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5A8E4C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p className="text-sm text-text-secondary">
          Looking good! Keep practicing to stay sharp.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {weak.map((topic) => (
        <Link
          key={topic.categoryId}
          href={`/practice?category=${topic.categoryId}`}
          className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-[rgba(199,123,26,0.06)]"
        >
          <div className="flex items-center gap-3">
            <div
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  topic.mastery < 30 ? "#BF4A2D" : topic.mastery < 50 ? "#B85A3B" : "#C77B1A",
              }}
            />
            <span className="text-sm text-text-primary">{topic.displayName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums font-medium text-text-muted">
              {topic.mastery}%
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}
