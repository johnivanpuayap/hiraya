"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function NavLink({ href, icon, label }: NavLinkProps): React.JSX.Element {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-250 ${
        isActive
          ? "bg-[rgba(199,123,26,0.15)] text-primary font-semibold"
          : "text-text-secondary hover:bg-[rgba(199,123,26,0.08)] hover:text-text-primary"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
      )}
      <span className="h-5 w-5">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
