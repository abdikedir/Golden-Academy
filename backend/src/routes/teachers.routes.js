import { Router } from "express";
import { teachersController } from "../controllers/teachers.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  authorize,
  authorizeDepartmentAdmin,
} from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { auditLog } from "../middlewares/audit.middleware.js";
import {
  createTeacher,
  updateTeacher,
  getTeacherById,
  deleteTeacher,
  assignTeacherToSubject,
} from "../validations/teachers.validation.js";

const router = Router();

// Route pattern: validation → auth → authorize → authorizeDepartmentAdmin → audit → controller
router.use(authenticate);

// List teachers (filtered by department for DEPARTMENT_ADMIN)
router.get("/", teachersController.list);

// Get authenticated teacher assignments
router.get(
  "/me/assignments",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"),
  teachersController.getMyAssignments,
);

// Get authenticated teacher homeroom class
router.get(
  "/me/homeroom-class",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"),
  teachersController.getMyHomeroomClass,
);

// Get teacher by ID
router.get("/:id", getTeacherById, validateRequest, teachersController.getById);

// Get teacher assignments
router.get(
  "/:id/assignments",
  validateRequest,
  teachersController.getAssignments,
);

// Get teacher homeroom class
router.get(
  "/:id/homeroom-class",
  validateRequest,
  teachersController.getHomeroomClass,
);

// Create teacher
router.post(
  "/",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR"),
  createTeacher,
  validateRequest,
  authorizeDepartmentAdmin,
  auditLog("CREATE", "TEACHER"),
  teachersController.create,
);

// Update teacher
router.put(
  "/:id",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR"),
  updateTeacher,
  validateRequest,
  authorizeDepartmentAdmin,
  auditLog("UPDATE", "TEACHER"),
  teachersController.update,
);

// Delete teacher
router.delete(
  "/:id",
  authorize("SYSTEM_ADMIN"),
  deleteTeacher,
  validateRequest,
  auditLog("DELETE", "TEACHER"),
  teachersController.remove,
);

// Assign teacher to subject
router.post(
  "/:id/assign",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN"),
  assignTeacherToSubject,
  validateRequest,
  authorizeDepartmentAdmin,
  auditLog("ASSIGN_TEACHER", "TEACHER_ASSIGNMENT"),
  teachersController.assignToSubject,
);

// Remove teacher from subject
router.delete(
  "/:id/assign/:classSubjectId",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN"),
  validateRequest,
  authorizeDepartmentAdmin,
  auditLog("REMOVE_TEACHER", "TEACHER_ASSIGNMENT"),
  teachersController.removeFromSubject,
);

export default router;
