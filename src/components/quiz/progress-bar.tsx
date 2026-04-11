interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const progress = total > 0 ? ((current - 1) / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-sm font-medium text-text-secondary">
        {current} of {total}
      </span>
    </div>
  );
}
