import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";
import { usersService } from "../services/users.service.js";
import { ApiError } from "../utils/ApiError.js";

export const usersController = {
  list: catchAsync(async (_req, res) => {
    const data = await usersService.list();
    return sendResponse(res, 200, "Users fetched successfully", data);
  }),

  getById: catchAsync(async (req, res) => {
    const data = await usersService.getById(req.params.id);
    return sendResponse(res, 200, "User fetched successfully", data);
  }),

  create: catchAsync(async (req, res) => {
    const data = await usersService.create(req.body);
    return sendResponse(res, 201, "User created successfully", data);
  }),

  update: catchAsync(async (req, res) => {
    const data = await usersService.update(req.params.id, req.body);
    return sendResponse(res, 200, "User updated successfully", data);
  }),

  remove: catchAsync(async (req, res) => {
    const data = await usersService.remove(req.params.id);
    return sendResponse(res, 200, "User deleted successfully", data);
  }),

  listWithRoles: catchAsync(async (_req, res) => {
    const data = await usersService.listWithRoles();
    return sendResponse(res, 200, "Users with roles fetched", data);
  }),

  assignRole: catchAsync(async (req, res) => {
    if (parseInt(req.params.id, 10) === req.user.userId) {
      throw new ApiError(403, "You cannot change your own role");
    }

    const roleId = req.body.roleId ?? req.body.role_id;
    const data = await usersService.assignRole(req.params.id, roleId);
    return sendResponse(res, 200, "Role assigned successfully", data);
  }),

  removeRole: catchAsync(async (req, res) => {
    if (parseInt(req.params.id, 10) === req.user.userId) {
      throw new ApiError(403, "You cannot change your own role");
    }

    const roleId = req.body.roleId ?? req.body.role_id;
    const data = await usersService.removeRole(req.params.id, roleId);
    return sendResponse(res, 200, "Role removed successfully", data);
  }),
};
