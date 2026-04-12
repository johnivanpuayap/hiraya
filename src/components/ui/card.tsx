interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  padding = "md",
  hover = false,
  className = "",
  children,
  ...props
}: CardProps): React.JSX.Element {
  return (
    <div
      className={`rounded-2xl glass shadow-warm transition-all duration-300 ease-out ${
        hover
          ? "hover:shadow-warm-lg hover:-translate-y-0.5"
          : ""
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
