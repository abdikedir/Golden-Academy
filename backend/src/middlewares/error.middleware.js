import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const notFound = (req, _res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

export const errorHandler = (err, _req, res, _next) => {
  let { statusCode, message } = err;

  // Handle PostgreSQL error codes (now using direct pg instead of Prisma)
  if (err.code === "23505") {
    // unique_violation
    statusCode = 409;
    message = "Duplicate entry - this record already exists";
  } else if (err.code === "23503") {
    // foreign_key_violation
    statusCode = 400;
    message = "Foreign key constraint failed - related record does not exist";
  } else if (err.code === "23502") {
    // not_null_violation
    statusCode = 400;
    message = "Required field is missing";
  } else if (err.code === "23514") {
    // check_violation
    statusCode = 400;
    message = "Value does not meet validation constraints";
  } else if (err.code === "22P02") {
    // invalid_text_representation
    statusCode = 400;
    message = "Invalid data format";
  }

  // Default to 500 if no status code
  statusCode = statusCode || 500;
  message = message || "Internal server error";

  // Build response object
  const response = {
    success: false,
    message,
    data: null,
  };

  // In production, don't expose internal error details for 500 errors
  if (statusCode === 500 && env.nodeEnv === "production") {
    response.message = "Internal server error";
  }

  // In development, include stack trace for 500 errors
  if (statusCode === 500 && env.nodeEnv === "development" && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};
