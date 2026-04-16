import { createCrudController } from "./crudFactory.controller.js";
import { departmentsService } from "../services/departments.service.js";

export const departmentsController = createCrudController(
  "Department",
  departmentsService,
);
