import { sendResponse } from "../utils/response.js";
import { catchAsync } from "../utils/catchAsync.js";

export const createCrudController = (entityName, service) => ({
  list: catchAsync(async (_req, res) => {
    const data = await service.list();
    return sendResponse(res, 200, `${entityName} list fetched`, data);
  }),
  getById: catchAsync(async (req, res) => {
    const data = await service.getById(req.params.id);
    return sendResponse(res, 200, `${entityName} fetched`, data);
  }),
  create: catchAsync(async (req, res) => {
    const data = await service.create(req.body);
    return sendResponse(res, 201, `${entityName} created`, data);
  }),
  update: catchAsync(async (req, res) => {
    const data = await service.update(req.params.id, req.body);
    return sendResponse(res, 200, `${entityName} updated`, data);
  }),
  remove: catchAsync(async (req, res) => {
    const data = await service.remove(req.params.id);
    return sendResponse(res, 200, `${entityName} deleted`, data);
  }),
});
