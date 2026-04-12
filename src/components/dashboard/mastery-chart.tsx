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
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[rgba(156,135,110,0.12)]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cat.mastery < 50 ? "bg-secondary" : "bg-primary-gradient"}`}
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
