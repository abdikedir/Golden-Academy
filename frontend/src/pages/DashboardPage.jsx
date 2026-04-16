import { Navigate, Route, Routes } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import AdminDashboard from "../components/dashboards/AdminDashboard";
import TeacherDashboard from "../components/dashboards/TeacherDashboard";
import RegistrarDashboard from "../components/dashboards/RegistrarDashboard";
import DepartmentDashboard from "../components/dashboards/DepartmentDashboard";
import { useAuth } from "../hooks/useAuth";

const DashboardRoot = () => {
  const { user } = useAuth();
  const roles = user?.roles || [];

  if (roles.includes("SYSTEM_ADMIN")) return <Navigate to="admin" replace />;
  if (roles.includes("DEPARTMENT_ADMIN"))
    return <Navigate to="department" replace />;
  if (roles.includes("REGISTRAR")) return <Navigate to="registrar" replace />;
  return <Navigate to="teacher" replace />;
};

const DashboardPage = () => {
  return (
    <PageLayout title="Dashboard">
      <Routes>
        <Route index element={<DashboardRoot />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="teacher" element={<TeacherDashboard />} />
        <Route path="registrar" element={<RegistrarDashboard />} />
        <Route path="department" element={<DepartmentDashboard />} />
      </Routes>
    </PageLayout>
  );
};

export default DashboardPage;
