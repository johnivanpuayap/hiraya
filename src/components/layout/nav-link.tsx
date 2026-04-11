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
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/15 text-accent"
          : "text-text-secondary hover:bg-surface hover:text-text-primary"
      }`}
    >
      <span className="h-5 w-5">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
