import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary-gradient text-white shadow-[0_4px_16px_rgba(199,123,26,0.35)] hover:shadow-[0_6px_24px_rgba(199,123,26,0.45)] hover:-translate-y-0.5",
  secondary:
    "border-2 border-glass text-accent hover:bg-[rgba(199,123,26,0.15)]",
  danger:
    "bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger",
  ghost:
    "text-text-secondary border border-glass hover:bg-[rgba(199,123,26,0.15)] hover:border-transparent",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-xl font-heading font-semibold transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
