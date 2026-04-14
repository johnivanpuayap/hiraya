interface TrendGraphProps {
  sessions: Array<{
    date: string;
    score: number;
  }>;
}

export function TrendGraph({ sessions }: TrendGraphProps) {
  if (sessions.length < 2) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9C876E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <p className="text-sm text-text-secondary">
          Complete more sessions to see your score trend.
        </p>
      </div>
    );
  }

  const width = 480;
  const height = 160;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 24;
  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  const points = sessions.map((s, i) => ({
    x: paddingLeft + (i / (sessions.length - 1)) * graphWidth,
    y: paddingTop + graphHeight - (s.score / 100) * graphHeight,
    score: s.score,
  }));

  // Smooth curve using cardinal spline
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Area fill path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + graphHeight} L ${points[0].x} ${paddingTop + graphHeight} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Score trend over ${sessions.length} sessions`}
    >
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C77B1A" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#C77B1A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => {
        const y = paddingTop + graphHeight - (pct / 100) * graphHeight;
        return (
          <g key={pct}>
            <line
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke="rgba(139, 94, 60, 0.08)"
              strokeWidth="1"
            />
            <text
              x={paddingLeft - 6}
              y={y + 3}
              textAnchor="end"
              fill="#9C876E"
              fontSize="9"
              fontFamily="Inter, sans-serif"
            >
              {pct}%
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill="url(#trend-fill)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#C77B1A" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#FFFAF0" stroke="#C77B1A" strokeWidth="2" />
        </g>
      ))}

      {/* Direct label on last point */}
      {points.length > 0 && (
        <text
          x={points[points.length - 1].x}
          y={points[points.length - 1].y - 10}
          textAnchor="middle"
          fill="#C77B1A"
          fontSize="10"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
        >
          {points[points.length - 1].score}%
        </text>
      )}
    </svg>
  );
}
