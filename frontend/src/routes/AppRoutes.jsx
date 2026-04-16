import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import StudentsPage from "../pages/StudentsPage";
import ClassesPage from "../pages/ClassesPage";
import SubjectsPage from "../pages/SubjectsPage";
import TeachersPage from "../pages/TeachersPage";
import DepartmentsPage from "../pages/DepartmentsPage";
import TermsPage from "../pages/TermsPage";
import MarksPage from "../pages/MarksPage";
import ReportsPage from "../pages/ReportsPage";
import AuditLogsPage from "../pages/AuditLogsPage";
import NotFoundPage from "../pages/NotFoundPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard/*" element={<DashboardPage />} />

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={["SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN"]}
            />
          }
        >
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
        </Route>

        <Route
          element={
            <RoleProtectedRoute allowedRoles={["SYSTEM_ADMIN", "REGISTRAR"]} />
          }
        >
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={["SYSTEM_ADMIN", "REGISTRAR", "TEACHER"]}
            />
          }
        >
          <Route path="/marks" element={<MarksPage />} />
        </Route>

        <Route element={<RoleProtectedRoute allowedRoles={["SYSTEM_ADMIN"]} />}>
          <Route path="/audit-logs" element={<AuditLogsPage />} />
        </Route>

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={[
                "SYSTEM_ADMIN",
                "REGISTRAR",
                "DEPARTMENT_ADMIN",
                "TEACHER",
              ]}
            />
          }
        >
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
