import { createContext, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";

export const RoleContext = createContext(null);

const roleDashboardMap = {
  SYSTEM_ADMIN: "/dashboard/admin",
  DEPARTMENT_ADMIN: "/dashboard/department",
  REGISTRAR: "/dashboard/registrar",
  TEACHER: "/dashboard/teacher",
};

export const RoleProvider = ({ children }) => {
  const { user } = useAuth();

  const roles = user?.roles || [];

  const value = useMemo(
    () => ({
      roles,
      hasRole: (role) => roles.includes(role),
      hasAnyRole: (allowed = []) =>
        allowed.some((role) => roles.includes(role)),
      defaultDashboardRoute: roleDashboardMap[roles[0]] || "/dashboard",
    }),
    [roles],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};
