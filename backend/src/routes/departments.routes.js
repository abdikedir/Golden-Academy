import { Router } from "express";
import {
  createDepartment,
  updateDepartment,
  getDepartmentById,
  deleteDepartment,
} from "../validations/departments.validation.js";
import { departmentsController } from "../controllers/departments.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  authorize,
  authorizeDepartmentSelf,
} from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { auditLog } from "../middlewares/audit.middleware.js";

const router = Router();
router.use(authenticate);

// List all departments - accessible to all authenticated users
router.get("/", departmentsController.list);

// Get department by ID - accessible to all authenticated users
router.get(
  "/:id",
  getDepartmentById,
  validateRequest,
  departmentsController.getById,
);

// Create department - SYSTEM_ADMIN only
router.post(
  "/",
  authorize("SYSTEM_ADMIN"),
  createDepartment,
  validateRequest,
  auditLog("CREATE", "DEPARTMENT"),
  departmentsController.create,
);

// Update department - SYSTEM_ADMIN only
router.put(
  "/:id",
  authorize("SYSTEM_ADMIN", "DEPARTMENT_ADMIN"),
  updateDepartment,
  validateRequest,
  authorizeDepartmentSelf,
  auditLog("UPDATE", "DEPARTMENT"),
  departmentsController.update,
);

// Delete department - SYSTEM_ADMIN only
router.delete(
  "/:id",
  authorize("SYSTEM_ADMIN"),
  deleteDepartment,
  validateRequest,
  auditLog("DELETE", "DEPARTMENT"),
  departmentsController.remove,
);

export default router;
