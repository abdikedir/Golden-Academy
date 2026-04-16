import { Router } from "express";
import { subjectsController } from "../controllers/subjects.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize, authorizeDepartmentAdmin } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { 
  createSubject, 
  updateSubject, 
  getSubjectById, 
  deleteSubject 
} from "../validations/subjects.validation.js";

const router = Router();

// Route pattern: validation → auth → authorize → authorizeDepartmentAdmin → controller
router.use(authenticate);

// List all subjects (filtered by department for DEPARTMENT_ADMIN)
router.get("/", subjectsController.list);

// Get subject by ID
router.get(
  "/:id",
  getSubjectById,
  validateRequest,
  subjectsController.getById
);

// Create subject (SYSTEM_ADMIN or DEPARTMENT_ADMIN)
router.post(
  "/",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN"),
  createSubject,
  validateRequest,
  authorizeDepartmentAdmin,
  subjectsController.create
);

// Update subject (SYSTEM_ADMIN or DEPARTMENT_ADMIN)
router.put(
  "/:id",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN"),
  updateSubject,
  validateRequest,
  authorizeDepartmentAdmin,
  subjectsController.update
);

// Delete subject (SYSTEM_ADMIN only)
router.delete(
  "/:id",
  authorize("SYSTEM_ADMIN"),
  deleteSubject,
  validateRequest,
  subjectsController.remove
);

export default router;
