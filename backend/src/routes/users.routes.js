import { Router } from "express";
import { usersController } from "../controllers/users.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { auditLog } from "../middlewares/audit.middleware.js";
import {
  createUser,
  updateUser,
  getUserById,
  deleteUser,
  assignRole,
  removeRole
} from "../validations/users.validation.js";

const router = Router();

router.use(authenticate, authorize("SYSTEM_ADMIN"));

router.get("/", usersController.list);
router.get("/with-roles", usersController.listWithRoles);
router.get(
  "/:id",
  getUserById,
  validateRequest,
  usersController.getById
);
router.post(
  "/",
  createUser,
  validateRequest,
  auditLog('CREATE', 'USER'),
  usersController.create
);
router.put(
  "/:id",
  updateUser,
  validateRequest,
  auditLog('UPDATE', 'USER'),
  usersController.update
);
router.delete(
  "/:id",
  deleteUser,
  validateRequest,
  auditLog('DELETE', 'USER'),
  usersController.remove
);
router.post(
  "/:id/roles",
  assignRole,
  validateRequest,
  auditLog('ASSIGN_ROLE', 'USER'),
  usersController.assignRole
);
router.delete(
  "/:id/roles",
  removeRole,
  validateRequest,
  auditLog('REMOVE_ROLE', 'USER'),
  usersController.removeRole
);

export default router;
