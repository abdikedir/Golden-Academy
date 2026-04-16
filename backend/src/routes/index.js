import { Router } from "express";
import authRoutes from "./auth.routes.js";
import rolesRoutes from "./roles.routes.js";
import usersRoutes from "./users.routes.js";
import departmentsRoutes from "./departments.routes.js";
import teachersRoutes from "./teachers.routes.js";
import subjectsRoutes from "./subjects.routes.js";
import classesRoutes from "./classes.routes.js";
import studentsRoutes from "./students.routes.js";
import termsRoutes from "./terms.routes.js";
import marksRoutes from "./marks.routes.js";
import enrollmentsRoutes from "./enrollments.routes.js";
import reportsRoutes from "./reports.routes.js";
import auditRoutes from "./audit.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/roles", rolesRoutes);
router.use("/users", usersRoutes);
router.use("/departments", departmentsRoutes);
router.use("/teachers", teachersRoutes);
router.use("/subjects", subjectsRoutes);
router.use("/classes", classesRoutes);
router.use("/students", studentsRoutes);
router.use("/terms", termsRoutes);
router.use("/marks", marksRoutes);
router.use("/enrollments", enrollmentsRoutes);
router.use("/reports", reportsRoutes);
router.use("/audit-logs", auditRoutes);

export default router;
