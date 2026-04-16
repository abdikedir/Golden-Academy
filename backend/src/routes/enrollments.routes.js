import { Router } from "express";
import { enrollmentsController } from "../controllers/enrollments.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  authorize,
  authorizeTeacherForClass,
} from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import * as enrollmentsValidation from "../validations/enrollments.validation.js";

const router = Router();

// Route pattern: validation → auth → authorize → controller
router.use(authenticate);

// List enrollments
router.get(
  "/",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN", "TEACHER"),
  authorizeTeacherForClass,
  enrollmentsValidation.listEnrollments,
  validateRequest,
  enrollmentsController.list,
);

// Enroll student
router.post(
  "/",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN"),
  enrollmentsValidation.enrollStudent,
  validateRequest,
  enrollmentsController.enrollStudent,
);

// Get enrollment history
router.get(
  "/history/:studentId",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN", "TEACHER"),
  enrollmentsValidation.getEnrollmentHistory,
  validateRequest,
  enrollmentsController.getEnrollmentHistory,
);

// Promote students
router.post(
  "/promote",
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  enrollmentsValidation.promoteStudents,
  validateRequest,
  enrollmentsController.promoteStudents,
);

export default router;
