"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";

interface SidebarProps {
  role: "student" | "teacher";
  hasClasses?: boolean;
}

const studentWithClassLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/practice", label: "Practice", icon: "📝" },
  { href: "/assignments", label: "Assignments", icon: "📋" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const studentNoClassLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/practice", label: "Practice", icon: "📝" },
  { href: "/classes/join", label: "Join Class", icon: "🏫" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/classes", label: "Classes", icon: "🏫" },
  { href: "/assignments", label: "Assignments", icon: "📋" },
  { href: "/questions", label: "Question Bank", icon: "📚" },
];

const STORAGE_KEY = "hiraya-sidebar-collapsed";

/** Match /practice/<uuid> paths — active quiz session */
const QUIZ_SESSION_PATTERN = /^\/practice\/[0-9a-f-]{36}/;

export function Sidebar({ role, hasClasses = true }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const inQuiz = QUIZ_SESSION_PATTERN.test(pathname);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const isCollapsed = collapsed || inQuiz;

  const links =
    role === "teacher"
      ? teacherLinks
      : hasClasses
        ? studentWithClassLinks
        : studentNoClassLinks;

  return (
    <aside
      className={`flex h-screen flex-col glass transition-[width] duration-300 ease-in-out shrink-0 ${
        isCollapsed ? "w-[68px]" : "w-[270px]"
      }`}
    >
      {/* Logo + toggle */}
      <div className={`flex items-center py-6 ${isCollapsed ? "justify-center px-0" : "gap-2 px-6"}`}>
        <Logo size={isCollapsed ? "sm" : "md"} showText={!isCollapsed} />
        {!inQuiz && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-[rgba(156,135,110,0.1)] hover:text-text-primary transition-colors ${
              isCollapsed ? "absolute top-6 right-2" : "ml-auto shrink-0"
            }`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              {isCollapsed ? (
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex flex-1 flex-col gap-1.5 py-2 ${isCollapsed ? "items-center px-2" : "px-4"}`}>
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

          return isCollapsed ? (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all duration-250 ${
                isActive
                  ? "bg-[rgba(199,123,26,0.15)] text-primary"
                  : "text-text-secondary hover:bg-[rgba(199,123,26,0.08)] hover:text-text-primary"
              }`}
              title={link.label}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
              )}
              <span>{link.icon}</span>
            </Link>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-250 ${
                isActive
                  ? "bg-[rgba(199,123,26,0.15)] text-primary font-semibold"
                  : "text-text-secondary hover:bg-[rgba(199,123,26,0.08)] hover:text-text-primary"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
              )}
              <span className="h-5 w-5">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-glass px-6 py-4" />
    </aside>
  );
}
