import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";
import { register, login } from "../validations/auth.validation.js";

const router = Router();

// Route pattern: validation → controller
router.post(
  "/register",
  authenticate,
  authorize("SYSTEM_ADMIN", "REGISTRAR"),
  register,
  validateRequest,
  authController.register,
);

router.post("/login", login, validateRequest, authController.login);

export default router;
