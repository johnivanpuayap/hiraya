import Link from "next/link";

interface WeakTopicsProps {
  topics: Array<{
    categoryId: string;
    displayName: string;
    mastery: number;
  }>;
}

export function WeakTopics({ topics }: WeakTopicsProps) {
  const weak = topics.slice(0, 5); // Top 5 weakest

  if (weak.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Start practicing to see your weak areas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {weak.map((topic) => (
        <div
          key={topic.categoryId}
          className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5"
        >
          <div>
            <p className="text-sm font-medium text-text-primary">
              {topic.displayName}
            </p>
            <p className="text-xs text-text-secondary">
              {topic.mastery}% mastery
            </p>
          </div>
          <Link
            href={`/practice?category=${topic.categoryId}`}
            className="text-xs font-medium text-accent hover:underline"
          >
            Practice
          </Link>
        </div>
      ))}
    </div>
  );
}
