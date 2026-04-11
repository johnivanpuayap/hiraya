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
      >
        {/* Sunrise arc — Golden Hour motif */}
        <path
          d="M6 28C6 18.059 14.059 10 24 10"
          stroke="#F5A623"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M10 32C10 21.507 18.507 13 29 13"
          stroke="#FF8A65"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />
        {/* Sun rays */}
        <circle cx="30" cy="10" r="3.5" fill="#F5A623" />
        <circle cx="35" cy="16" r="2" fill="#FF8A65" opacity="0.7" />
        <circle cx="24" cy="5" r="1.5" fill="#FF8A65" opacity="0.5" />
        {/* Horizon line */}
        <line
          x1="4"
          y1="32"
          x2="36"
          y2="32"
          stroke="#C67A1A"
          strokeWidth="2"
          strokeLinecap="round"
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
