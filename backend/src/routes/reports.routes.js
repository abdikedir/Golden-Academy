import { Router } from "express";
import { reportsController } from "../controllers/reports.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  authorize,
  authorizeTeacherForClass,
} from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { param } from "express-validator";

const router = Router();

// Route pattern: validation → auth → authorize → authorizeHomeroomTeacher → controller
router.use(authenticate);

// Academic report - filtered aggregate across enrollments/marks
router.get(
  "/academic",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"),
  reportsController.getAcademicReport,
);

// Class report - homeroom teacher only (or system admin / department admin)
router.get(
  "/class/:classId",
  param("classId").isInt({ min: 1 }).withMessage("Invalid class ID"),
  validateRequest,
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"),
  authorizeTeacherForClass,
  reportsController.getClassReport,
);

// Mark completion status - homeroom teacher only (or system admin / department admin)
router.get(
  "/class/:classId/completion",
  param("classId").isInt({ min: 1 }).withMessage("Invalid class ID"),
  validateRequest,
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"),
  authorizeTeacherForClass,
  reportsController.getMarkCompletionStatus,
);

// Department report - department admin or system admin
router.get(
  "/department/:departmentId",
  param("departmentId").isInt({ min: 1 }).withMessage("Invalid department ID"),
  validateRequest,
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN"),
  reportsController.getDepartmentReport,
);

export default router;
