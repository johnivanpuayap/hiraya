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
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Hiraya logo"
      >
        {/* Glow bloom at the spine origin */}
        <ellipse
          cx="20"
          cy="27"
          rx="7"
          ry="4"
          fill="#F5A623"
          opacity="0.18"
        />

        {/* Light rays fanning upward from spine */}
        <line x1="20" y1="26" x2="20" y2="8" stroke="#F5A623" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <line x1="20" y1="26" x2="13" y2="9" stroke="#F5A623" strokeWidth="0.9" strokeLinecap="round" opacity="0.4" />
        <line x1="20" y1="26" x2="9" y2="13" stroke="#FF8A65" strokeWidth="0.7" strokeLinecap="round" opacity="0.28" />
        <line x1="20" y1="26" x2="27" y2="9" stroke="#F5A623" strokeWidth="0.9" strokeLinecap="round" opacity="0.4" />
        <line x1="20" y1="26" x2="31" y2="13" stroke="#FF8A65" strokeWidth="0.7" strokeLinecap="round" opacity="0.28" />

        {/* Left page-wing */}
        <path d="M20 27 L5 32 L7 18 L20 14" fill="#F5A623" opacity="0.92" />
        <path d="M20 27 L14 29 L15 20 L20 14" fill="#FFC84A" opacity="0.55" />

        {/* Right page-wing */}
        <path d="M20 27 L35 32 L33 18 L20 14" fill="#FF8A65" opacity="0.88" />
        <path d="M20 27 L26 29 L25 20 L20 14" fill="#FFB08A" opacity="0.5" />

        {/* Spine line */}
        <line x1="20" y1="13" x2="20" y2="28" stroke="#C67A1A" strokeWidth="1.5" strokeLinecap="round" />

        {/* Apex spark */}
        <path d="M20 7 L21.4 10 L20 9.2 L18.6 10 Z" fill="#F5A623" />
        <circle cx="20" cy="8.5" r="1.6" fill="#FFC84A" opacity="0.9" />

        {/* Horizon baseline */}
        <line x1="4" y1="34" x2="36" y2="34" stroke="#C67A1A" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
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
