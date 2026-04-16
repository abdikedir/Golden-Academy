import { Router } from "express";
import { studentsController } from "../controllers/students.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  createStudent,
  updateStudent,
  getStudentById,
  deleteStudent,
  searchStudents,
} from "../validations/students.validation.js";

const router = Router();

// Route pattern: validation → auth → authorize → controller
router.use(authenticate);

// Search students (must come before /:id to avoid route conflict)
router.get(
  "/search",
  searchStudents,
  validateRequest,
  studentsController.search,
);

// List all students
router.get("/", studentsController.list);

// Get student by ID
router.get("/:id", getStudentById, validateRequest, studentsController.getById);

// Create student (REGISTRAR or SYSTEM_ADMIN only)
router.post(
  "/",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN"),
  createStudent,
  validateRequest,
  studentsController.create,
);

// Update student (REGISTRAR or SYSTEM_ADMIN only)
router.put(
  "/:id",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN"),
  updateStudent,
  validateRequest,
  studentsController.update,
);

// Delete student (SYSTEM_ADMIN or REGISTRAR only)
router.delete(
  "/:id",
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  deleteStudent,
  validateRequest,
  studentsController.remove,
);

export default router;
