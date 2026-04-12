import { NavLink } from "@/components/layout/nav-link";
import { Logo } from "@/components/ui/logo";

interface SidebarProps {
  role: "student" | "teacher";
  hasClasses?: boolean;
}

const studentBaseLinks = [
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

export function Sidebar({ role, hasClasses = true }: SidebarProps): React.JSX.Element {
  const links =
    role === "teacher"
      ? teacherLinks
      : studentBaseLinks.filter(
          (link) => link.href !== "/assignments" || hasClasses
        );

  return (
    <aside className="flex h-screen w-[270px] flex-col glass">
      <div className="px-6 py-6">
        <Logo size="md" />
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-4 py-2">
        {links.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={<span>{link.icon}</span>}
          />
        ))}
      </nav>

      <div className="border-t border-glass px-6 py-4" />
    </aside>
  );
}
