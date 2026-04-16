import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";
import * as authService from "../services/auth.service.js";

export const register = catchAsync(async (req, res) => {
  const data = await authService.register(req.body);
  return sendResponse(res, 201, "User registered successfully", data);
});

export const login = catchAsync(async (req, res) => {
  const data = await authService.login(req.body);
  return sendResponse(res, 200, "Login successful", data);
});
