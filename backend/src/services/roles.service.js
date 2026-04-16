import { createCrudService } from "./crudFactory.js";

export const rolesService = createCrudService({
  table: "roles",
  idColumn: "role_id",
  writableColumns: ["name"],
  orderBy: "name",
});
