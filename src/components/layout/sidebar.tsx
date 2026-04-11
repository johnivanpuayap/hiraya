"use client";

import { NavLink } from "@/components/layout/nav-link";

interface SidebarProps {
  role: "student" | "teacher";
}

const studentLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/practice", label: "Practice", icon: "📝" },
  { href: "/assignments", label: "Assignments", icon: "📋" },
  { href: "/classes/join", label: "Join Class", icon: "🏫" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/classes", label: "Classes", icon: "🏫" },
  { href: "/assignments", label: "Assignments", icon: "📋" },
  { href: "/questions", label: "Question Bank", icon: "📚" },
];

export function Sidebar({ role }: SidebarProps): React.JSX.Element {
  const links = role === "student" ? studentLinks : teacherLinks;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-surface bg-white">
      <div className="flex items-center gap-2 px-6 py-5">
        <h1 className="font-heading text-2xl font-bold text-primary">
          Hiraya
        </h1>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {links.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={<span>{link.icon}</span>}
          />
        ))}
      </nav>

      <div className="border-t border-surface px-6 py-4">
        <p className="text-xs text-text-secondary">Aral hanggang pasa</p>
      </div>
    </aside>
  );
}
