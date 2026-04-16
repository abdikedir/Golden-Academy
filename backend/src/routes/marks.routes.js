import { Router } from "express";
import { marksController } from "../controllers/marks.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { auditLog } from "../middlewares/audit.middleware.js";
import * as marksValidation from "../validations/marks.validation.js";

const router = Router();

// Route pattern: validation → auth → authorize → audit → controller
router.use(authenticate);

// List all marks (with optional filters)
router.get("/", marksController.list);

// Get marks for authenticated teacher
router.get(
  "/mine",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"),
  marksController.getMine,
);

// Get mark by ID
router.get(
  "/:id",
  marksValidation.getMarkById,
  validateRequest,
  marksController.getById,
);

// Get marks by class ID
router.get(
  "/class/:classId",
  marksValidation.getClassMarks,
  validateRequest,
  marksController.getByClassId,
);

// Get marks by student ID
router.get(
  "/student/:studentId",
  marksValidation.getStudentMarks,
  validateRequest,
  marksController.getByStudentId,
);

// Get marks by teacher ID
router.get(
  "/teacher/:teacherId",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN", "REGISTRAR", "TEACHER"),
  validateRequest,
  marksController.getByTeacherId,
);

// Submit mark (teacher) - authorization checked in service layer
router.post(
  "/submit",
  authorize("SYSTEM_ADMIN", "TEACHER"),
  marksValidation.submitMarks,
  validateRequest,
  auditLog("SUBMIT_MARKS", "MARKS"),
  marksController.submitMark,
);

// Update mark by teacher - authorization checked in service layer
router.put(
  "/:id/teacher-update",
  authorize("SYSTEM_ADMIN", "TEACHER"),
  marksValidation.updateMark,
  validateRequest,
  auditLog("UPDATE_MARKS", "MARKS"),
  marksController.updateMarkByTeacher,
);

// Create mark (admin/registrar)
router.post(
  "/",
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  marksValidation.submitMarks,
  validateRequest,
  auditLog("CREATE_MARKS", "MARKS"),
  marksController.create,
);

// Update mark (admin/registrar)
router.put(
  "/:id",
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  marksValidation.updateMark,
  validateRequest,
  auditLog("UPDATE_MARKS", "MARKS"),
  marksController.update,
);

// Delete mark (admin only)
router.delete(
  "/:id",
  authorize("SYSTEM_ADMIN"),
  marksValidation.getMarkById,
  validateRequest,
  auditLog("DELETE_MARKS", "MARKS"),
  marksController.remove,
);

export default router;
