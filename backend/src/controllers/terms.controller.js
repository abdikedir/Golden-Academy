import { createCrudController } from "./crudFactory.controller.js";
import { termsService } from "../services/terms.service.js";

export const termsController = createCrudController("Term", termsService);
