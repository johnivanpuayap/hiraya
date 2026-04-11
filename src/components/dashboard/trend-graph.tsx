interface TrendGraphProps {
  sessions: Array<{
    date: string;
    score: number;
  }>;
}

export function TrendGraph({ sessions }: TrendGraphProps) {
  if (sessions.length < 2) {
    return (
      <p className="text-sm text-text-secondary">
        Complete more sessions to see your score trend.
      </p>
    );
  }

  const width = 400;
  const height = 120;
  const padding = 24;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const points = sessions.map((s, i) => ({
    x: padding + (i / (sessions.length - 1)) * graphWidth,
    y: padding + graphHeight - (s.score / 100) * graphHeight,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => {
        const y = padding + graphHeight - (pct / 100) * graphHeight;
        return (
          <g key={pct}>
            <line
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#FFF3E6"
              strokeWidth="1"
            />
            <text
              x={padding - 4}
              y={y + 3}
              textAnchor="end"
              className="fill-text-secondary"
              fontSize="8"
            >
              {pct}%
            </text>
          </g>
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke="#C67A1A" strokeWidth="2" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#C67A1A" />
      ))}
    </svg>
  );
}
