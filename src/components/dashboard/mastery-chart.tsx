interface MasteryChartProps {
  categories: Array<{
    displayName: string;
    mastery: number;
    questionsSeen: number;
  }>;
}

export function MasteryChart({ categories }: MasteryChartProps) {
  return (
    <div className="flex flex-col gap-3">
      {categories.map((cat) => (
        <div key={cat.displayName} className="flex items-center gap-3">
          <span className="w-40 truncate text-sm text-text-secondary">
            {cat.displayName}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${cat.mastery}%` }}
            />
          </div>
          <span className="w-12 text-right text-sm font-medium text-text-primary">
            {cat.questionsSeen > 0 ? `${cat.mastery}%` : "\u2014"}
          </span>
        </div>
      ))}
    </div>
  );
}
