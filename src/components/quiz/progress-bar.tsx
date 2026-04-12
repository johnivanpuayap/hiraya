interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const progress = total > 0 ? ((current - 1) / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(156,135,110,0.12)]">
        <div
          className="h-full rounded-full bg-primary-gradient shadow-[0_0_8px_rgba(199,123,26,0.3)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-sm font-medium text-text-muted">
        {current} of {total}
      </span>
    </div>
  );
}
