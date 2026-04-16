import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const RoleProtectedRoute = ({ allowedRoles = [] }) => {
  const { user } = useAuth();
  const userRoles = user?.roles || [];

  const hasAccess = allowedRoles.some((role) => userRoles.includes(role));
  return hasAccess ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default RoleProtectedRoute;
