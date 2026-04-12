interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = {
  sm: { mark: 24, text: "text-lg" },
  md: { mark: 32, text: "text-2xl" },
  lg: { mark: 40, text: "text-3xl" },
} as const;

export function Logo({ size = "md", showText = true }: LogoProps) {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Hiraya logo"
      >
        {/* Ambient glow */}
        <circle cx="40" cy="32" r="12" fill="#E6A040" opacity="0.12" />

        {/* Main 8-pointed star (tala) */}
        <path
          d="M40 12 L43 26 L56 20 L46 30 L58 32 L46 34 L56 44 L43 38 L40 52 L37 38 L24 44 L34 34 L22 32 L34 30 L24 20 L37 26 Z"
          fill="#C77B1A"
          opacity="0.85"
        />

        {/* Inner star highlight */}
        <path
          d="M40 22 L42 30 L48 26 L44 32 L50 32 L44 34 L48 38 L42 34 L40 42 L38 34 L32 38 L36 34 L30 32 L36 32 L32 26 L38 30 Z"
          fill="#E6A040"
          opacity="0.7"
        />

        {/* Center circle */}
        <circle cx="40" cy="32" r="4" fill="#FFFAF0" />
        <circle cx="40" cy="32" r="2.5" fill="#E6A040" opacity="0.6" />

        {/* Horizon line */}
        <line
          x1="12"
          y1="64"
          x2="68"
          y2="64"
          stroke="#C77B1A"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>

      {showText && (
        <span
          className={`font-heading ${s.text} font-bold tracking-tight text-text-primary`}
        >
          Hiraya
        </span>
      )}
    </div>
  );
}
