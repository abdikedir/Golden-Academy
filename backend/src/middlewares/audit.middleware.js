import pool from '../config/db.js';

/**
 * Extract resource ID from request or response data
 * @param {Object} req - Express request object
 * @param {Object} data - Response data
 * @returns {number|null} - Resource ID or null
 */
function extractResourceId(req, data) {
  // Try to get ID from response data first
  if (data?.id) return parseInt(data.id);
  if (data?.userId) return parseInt(data.userId);
  if (data?.studentId) return parseInt(data.studentId);
  if (data?.teacherId) return parseInt(data.teacherId);
  if (data?.classId) return parseInt(data.classId);
  if (data?.subjectId) return parseInt(data.subjectId);
  if (data?.departmentId) return parseInt(data.departmentId);
  if (data?.roleId) return parseInt(data.roleId);
  if (data?.enrollmentId) return parseInt(data.enrollmentId);
  if (data?.markId) return parseInt(data.markId);
  
  // Try to get ID from request params
  if (req.params?.id) return parseInt(req.params.id);
  if (req.params?.userId) return parseInt(req.params.userId);
  if (req.params?.studentId) return parseInt(req.params.studentId);
  if (req.params?.teacherId) return parseInt(req.params.teacherId);
  if (req.params?.classId) return parseInt(req.params.classId);
  if (req.params?.subjectId) return parseInt(req.params.subjectId);
  if (req.params?.departmentId) return parseInt(req.params.departmentId);
  
  // Try to get ID from request body
  if (req.body?.id) return parseInt(req.body.id);
  if (req.body?.userId) return parseInt(req.body.userId);
  if (req.body?.studentId) return parseInt(req.body.studentId);
  
  return null;
}

/**
 * Sanitize request body by removing sensitive data
 * @param {Object} body - Request body
 * @returns {Object} - Sanitized body
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') {
    return {};
  }
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.passwordHash;
  delete sanitized.password_hash;
  delete sanitized.token;
  delete sanitized.accessToken;
  delete sanitized.refreshToken;
  
  return sanitized;
}

/**
 * Audit logging middleware
 * Creates an audit log entry after successful operations
 * @param {string} action - Action type (CREATE, UPDATE, DELETE, ASSIGN_ROLE, PUBLISH_RESULTS, ASSIGN_TEACHER)
 * @param {string} resourceType - Resource type (USER, ROLE, MARKS, TEACHER_ASSIGNMENT, CLASS, etc.)
 * @returns {Function} - Express middleware function
 */
export const auditLog = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to intercept response
    res.json = async (data) => {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Ensure user is authenticated
          if (req.user && req.user.userId) {
            const resourceId = extractResourceId(req, data);
            const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
            const metadata = {
              method: req.method,
              path: req.path,
              body: sanitizeBody(req.body),
              query: req.query,
              params: req.params
            };
            
            await pool.query(`
              INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, metadata)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              req.user.userId,
              action,
              resourceType,
              resourceId,
              ipAddress,
              JSON.stringify(metadata)
            ]);
          }
        } catch (error) {
          // Log error but don't fail the request
          console.error('Audit log creation failed:', error);
        }
      }
      
      // Call original json method
      return originalJson(data);
    };
    
    next();
  };
};

export { extractResourceId, sanitizeBody };
