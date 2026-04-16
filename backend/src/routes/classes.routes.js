import { Router } from "express";
import { classesController } from "../controllers/classes.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  authorize,
  authorizeHomeroomTeacher,
} from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { auditLog } from "../middlewares/audit.middleware.js";
import {
  createClass,
  updateClass,
  publishResults,
  getClassById,
  deleteClass,
  addClassSubject,
  removeClassSubject,
} from "../validations/classes.validation.js";

const router = Router();

// Route pattern: validation → auth → authorize → audit → controller
router.use(authenticate);

router.get("/", classesController.list);

router.get(
  "/:id/subjects",
  getClassById,
  validateRequest,
  classesController.getSubjects,
);

router.post(
  "/:id/subjects",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN"),
  addClassSubject,
  validateRequest,
  auditLog("ADD_SUBJECT", "CLASS_SUBJECT"),
  classesController.addSubject,
);

router.delete(
  "/:id/subjects/:subjectId",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN"),
  removeClassSubject,
  validateRequest,
  auditLog("REMOVE_SUBJECT", "CLASS_SUBJECT"),
  classesController.removeSubject,
);

router.get("/:id", getClassById, validateRequest, classesController.getById);

router.get(
  "/:id/marks-complete",
  getClassById,
  validateRequest,
  classesController.checkMarksComplete,
);

router.post(
  "/",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN"),
  createClass,
  validateRequest,
  auditLog("CREATE", "CLASS"),
  classesController.create,
);

router.put(
  "/:id",
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  updateClass,
  validateRequest,
  auditLog("UPDATE", "CLASS"),
  classesController.update,
);

router.post(
  "/:id/publish-results",
  authorize("SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN", "TEACHER"),
  authorizeHomeroomTeacher,
  publishResults,
  validateRequest,
  auditLog("PUBLISH_RESULTS", "CLASS"),
  classesController.publishResults,
);

router.delete(
  "/:id",
  authorize("SYSTEM_ADMIN"),
  deleteClass,
  validateRequest,
  auditLog("DELETE", "CLASS"),
  classesController.remove,
);

export default router;
