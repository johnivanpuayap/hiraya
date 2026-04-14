interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subText?: string;
}

export function StatCard({ label, value, icon, subText }: StatCardProps): React.JSX.Element {
  return (
    <div className="group relative glass rounded-2xl p-5 shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(199,123,26,0.1)]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </p>
          <p className="mt-0.5 font-heading text-2xl text-text-primary">
            {value}
          </p>
          {subText && (
            <p className="text-xs font-medium text-success">{subText}</p>
          )}
        </div>
      </div>
    </div>
  );
}
