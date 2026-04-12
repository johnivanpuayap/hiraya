interface StatCardProps {
  label: string;
  value: string | number;
  subText?: string;
}

export function StatCard({ label, value, subText }: StatCardProps): React.JSX.Element {
  return (
    <div className="group relative glass rounded-2xl p-5 shadow-warm transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-0.5 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl text-text-primary">
        {value}
      </p>
      {subText && (
        <p className="mt-1 text-xs font-medium text-success">{subText}</p>
      )}
    </div>
  );
}
