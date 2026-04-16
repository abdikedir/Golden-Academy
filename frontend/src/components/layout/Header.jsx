import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { LogOut, Moon, Sun } from "lucide-react";

const Header = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const roles = user?.roles || [];

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-[1600px] items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 lg:min-h-16 lg:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base lg:text-lg">
            <span className="hidden sm:inline">Golden High School </span>Academic Management
          </h1>
          <p className="hidden text-xs text-emerald-700 sm:block">
            Production operations portal for academic administration
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Theme toggle — icon-only on mobile */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-800 transition hover:bg-emerald-100 sm:px-3 sm:py-2"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </span>
          </button>

          {/* User info — hidden on mobile */}
          <div className="hidden text-right md:block">
            <p className="max-w-[160px] truncate text-sm font-medium text-slate-700">
              {user?.email || "Guest"}
            </p>
            <div className="mt-1 flex flex-wrap justify-end gap-1">
              {roles.length ? (
                roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  No role
                </span>
              )}
            </div>
          </div>

          {/* Sign out — icon-only on mobile */}
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            className="rounded-lg bg-rose-600 p-2 text-white transition hover:bg-rose-700 sm:px-3 sm:py-2"
          >
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
