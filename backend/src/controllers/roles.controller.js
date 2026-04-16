import { createCrudController } from "./crudFactory.controller.js";
import { rolesService } from "../services/roles.service.js";

export const rolesController = createCrudController("Role", rolesService);
