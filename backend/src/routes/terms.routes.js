import { Router } from "express";
import { termsController } from "../controllers/terms.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import {
  createTerm,
  updateTerm,
  getTermById,
  deleteTerm,
} from "../validations/terms.validation.js";

const router = Router();

// Route pattern: validation → auth → authorize → controller
router.use(authenticate);

// List all terms
router.get("/", termsController.list);

// Get term by ID
router.get("/:id", getTermById, validateRequest, termsController.getById);

// Create term
router.post(
  "/",
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  createTerm,
  validateRequest,
  termsController.create,
);

// Update term
router.put(
  "/:id",
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  updateTerm,
  validateRequest,
  termsController.update,
);

// Delete term
router.delete(
  "/:id",
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  deleteTerm,
  validateRequest,
  termsController.remove,
);

export default router;
