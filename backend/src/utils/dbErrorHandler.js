import { ApiError } from "./ApiError.js";

/**
 * Map PostgreSQL error codes to appropriate HTTP status codes and messages
 * @param {Error} error - PostgreSQL error
 * @param {string} customMessage - Optional custom error message
 * @throws {ApiError} - Mapped API error
 */
export const handleDatabaseError = (error, customMessage = null) => {
  // If it's already an ApiError, just re-throw it
  if (error instanceof ApiError) {
    throw error;
  }

  // Log the error for debugging
  console.error('Database error:', {
    code: error.code,
    message: error.message,
    detail: error.detail,
    hint: error.hint
  });

  // Map PostgreSQL error codes to HTTP status codes
  switch (error.code) {
    case '23505': // unique_violation
      throw new ApiError(409, customMessage || 'Duplicate entry. This record already exists.');
    
    case '23503': // foreign_key_violation
      throw new ApiError(400, customMessage || 'Referenced resource does not exist or cannot delete due to existing references.');
    
    case '23502': // not_null_violation
      throw new ApiError(400, customMessage || 'Required field is missing.');
    
    case '23514': // check_violation
      throw new ApiError(400, customMessage || 'Value does not meet validation constraints.');
    
    case '22P02': // invalid_text_representation (e.g., invalid UUID, invalid integer)
      throw new ApiError(400, customMessage || 'Invalid data format.');
    
    case '42P01': // undefined_table
      throw new ApiError(500, 'Database configuration error: table not found.');
    
    case '42703': // undefined_column
      throw new ApiError(500, 'Database configuration error: column not found.');
    
    case '08006': // connection_failure
    case '08003': // connection_does_not_exist
    case '08000': // connection_exception
      throw new ApiError(503, 'Database connection error. Please try again later.');
    
    case '57P03': // cannot_connect_now
      throw new ApiError(503, 'Database is temporarily unavailable.');
    
    case '53300': // too_many_connections
      throw new ApiError(503, 'Database connection pool exhausted. Please try again later.');
    
    default:
      // For unknown database errors, throw a generic 500 error
      throw new ApiError(500, customMessage || 'Database operation failed.');
  }
};

/**
 * Wrap a database operation with error handling
 * @param {Function} operation - Async function to execute
 * @param {string} customMessage - Optional custom error message for constraint violations
 * @returns {Promise<any>} - Result of the operation
 */
export const withErrorHandling = async (operation, customMessage = null) => {
  try {
    return await operation();
  } catch (error) {
    handleDatabaseError(error, customMessage);
  }
};

/**
 * Wrap a transaction with proper error handling and rollback
 * @param {Pool} pool - Database pool
 * @param {Function} transactionFn - Async function that receives a client and performs transaction operations
 * @param {string} customMessage - Optional custom error message
 * @returns {Promise<any>} - Result of the transaction
 */
export const withTransaction = async (pool, transactionFn, customMessage = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await transactionFn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    handleDatabaseError(error, customMessage);
  } finally {
    client.release();
  }
};
