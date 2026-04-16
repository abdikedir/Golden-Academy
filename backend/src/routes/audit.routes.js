import { Router } from "express";
import { auditController } from "../controllers/audit.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  createAuditLog,
  deleteAuditLog,
  exportAuditLogs,
  getActionAuditLogs,
  getAuditLog,
  getDateRangeAuditLogs,
  getResourceTypeAuditLogs,
  getUserAuditLogs,
  listAuditLogs,
  updateAuditLog,
} from "../validations/audit.validation.js";

const router = Router();

router.use(authenticate, authorize("SYSTEM_ADMIN"));

router.post("/", createAuditLog, validateRequest, auditController.create);

router.get("/", listAuditLogs, validateRequest, auditController.list);

router.get(
  "/export",
  exportAuditLogs,
  validateRequest,
  auditController.exportLogs,
);

router.get(
  "/date-range",
  getDateRangeAuditLogs,
  validateRequest,
  auditController.getByDateRange,
);

router.get(
  "/user/:userId",
  getUserAuditLogs,
  validateRequest,
  auditController.getByUser,
);

router.get(
  "/action/:action",
  getActionAuditLogs,
  validateRequest,
  auditController.getByAction,
);

router.get(
  "/resource/:resourceType",
  getResourceTypeAuditLogs,
  validateRequest,
  auditController.getByResourceType,
);

router.get("/:id", getAuditLog, validateRequest, auditController.getById);

router.put("/:id", updateAuditLog, validateRequest, auditController.update);

router.delete("/:id", deleteAuditLog, validateRequest, auditController.remove);

export default router;
