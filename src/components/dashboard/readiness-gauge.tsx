interface ReadinessGaugeProps {
  readiness: number;
}

export function ReadinessGauge({ readiness }: ReadinessGaugeProps) {
  const size = 180;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (readiness / 100) * circumference;
  const center = size / 2;

  const color =
    readiness >= 70 ? "#5A8E4C" : readiness >= 40 ? "#C77B1A" : "#BF4A2D";

  const label =
    readiness >= 70 ? "Ready" : readiness >= 40 ? "Getting There" : "Keep Going";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(199,123,26,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="text-center">
          <p className="font-heading text-5xl font-bold text-text-primary">
            {readiness}%
          </p>
          <p className="mt-0.5 text-sm font-medium" style={{ color }}>
            {label}
          </p>
        </div>
      </div>
      <p className="text-sm font-medium text-text-secondary">Exam Readiness</p>
    </div>
  );
}
