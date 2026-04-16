import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  School,
  Shield,
  UserCog,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"],
  },
  {
    to: "/students",
    label: "Students",
    icon: GraduationCap,
    roles: ["SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR"],
  },
  {
    to: "/classes",
    label: "Classes",
    icon: School,
    roles: ["SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR"],
  },
  {
    to: "/subjects",
    label: "Subjects",
    icon: BookOpen,
    roles: ["SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR"],
  },
  {
    to: "/teachers",
    label: "Teachers",
    icon: UserCog,
    roles: ["SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR"],
  },
  {
    to: "/departments",
    label: "Departments",
    icon: Building2,
    roles: ["SYSTEM_ADMIN", "DEPARTMENT_ADMIN"],
  },
  {
    to: "/terms",
    label: "Terms",
    icon: CalendarDays,
    roles: ["SYSTEM_ADMIN", "REGISTRAR"],
  },
  {
    to: "/marks",
    label: "Marks",
    icon: ClipboardCheck,
    roles: ["SYSTEM_ADMIN", "REGISTRAR", "TEACHER"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"],
  },
  {
    to: "/audit-logs",
    label: "Audit Logs",
    icon: Shield,
    roles: ["SYSTEM_ADMIN"],
  },
];

const Sidebar = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const userRoles = Array.isArray(user?.roles)
    ? user.roles.filter(Boolean)
    : [];

  const normalizedRoles = userRoles.map((role) => String(role).toUpperCase());
  if (
    normalizedRoles.length === 0 &&
    (user?.teacher?.teacherId || user?.teacher?.teacher_id)
  ) {
    normalizedRoles.push("TEACHER");
  }

  const hasAccess = (itemRoles) =>
    itemRoles.some((role) => normalizedRoles.includes(role));

  const visibleItems = navItems.filter((item) => hasAccess(item.roles));

  const navLinks = (onClick, compact = false) =>
    visibleItems.map((item) => {
      const Icon = item.icon;
      return (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onClick}
          title={compact ? item.label : undefined}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${compact ? "justify-center lg:justify-start" : ""} ${
              isActive
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-700 hover:bg-emerald-50"
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className={compact ? "hidden lg:inline" : "inline"}>
            {item.label}
          </span>
        </NavLink>
      );
    });

  return (
    <>
      {/* Mobile floating trigger */}
      <div className="pointer-events-none fixed left-3 top-[4.35rem] z-40 md:hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setMobileOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-emerald-50"
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(86vw,22rem)] transform border-r border-emerald-100 bg-white shadow-xl transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-emerald-100 bg-emerald-50/70 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                Golden High School
              </p>
              <span className="text-sm font-bold text-slate-800">
                Navigation
              </span>
            </div>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(normalizedRoles || []).slice(0, 3).map((role) => (
              <span
                key={role}
                className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navLinks(() => setMobileOpen(false), false)}
        </nav>
      </aside>

      {/* Tablet/Desktop sidebar */}
      <aside className="hidden shrink-0 border-r border-emerald-100 bg-white/90 md:sticky md:top-14 md:block md:h-[calc(100vh-3.5rem)] md:w-20 md:overflow-hidden lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-64">
        <div className="border-b border-emerald-100 px-2 py-3 lg:px-4">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 lg:block">
            Navigation
          </p>
          <span className="hidden text-sm font-bold text-slate-800 lg:block">
            Main Menu
          </span>
          <span className="block text-center text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700 lg:hidden">
            Menu
          </span>
        </div>
        <nav className="space-y-1 p-2 lg:p-4">{navLinks(undefined, true)}</nav>
      </aside>
    </>
  );
};

export default Sidebar;
