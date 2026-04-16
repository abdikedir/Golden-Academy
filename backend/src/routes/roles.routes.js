import { Router } from "express";
import { body, param } from "express-validator";
import { rolesController } from "../controllers/roles.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { validateRequest } from "../middlewares/validate.middleware.js";

const router = Router();

router.use(authenticate, authorize("SYSTEM_ADMIN"));

router.get("/", rolesController.list);
router.get(
  "/:id",
  param("id").isInt(),
  validateRequest,
  rolesController.getById,
);
router.post(
  "/",
  body("name").isString().notEmpty(),
  validateRequest,
  rolesController.create,
);
router.put(
  "/:id",
  param("id").isInt(),
  body("name").isString().notEmpty(),
  validateRequest,
  rolesController.update,
);
router.delete(
  "/:id",
  param("id").isInt(),
  validateRequest,
  rolesController.remove,
);

export default router;
