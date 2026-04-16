import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return next(new ApiError(400, first.msg));
  }
  return next();
};

// Alias for convenience
export const validate = validateRequest;
