interface ReadinessGaugeProps {
  readiness: number;
}

export function ReadinessGauge({ readiness }: ReadinessGaugeProps) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (readiness / 100) * circumference;

  const color =
    readiness >= 70 ? "#5A8E4C" : readiness >= 40 ? "#C77B1A" : "#BF4A2D";

  return (
    <div className="flex flex-col items-center">
      <svg width="148" height="148" className="-rotate-90">
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          stroke="#FFF3E6"
          strokeWidth="12"
        />
        <circle
          cx="74"
          cy="74"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="-mt-24 text-center">
        <p className="font-heading text-4xl font-bold text-text-primary">
          {readiness}%
        </p>
        <p className="text-xs text-text-secondary">Exam Readiness</p>
      </div>
    </div>
  );
}
