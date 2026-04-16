import pool from "../config/db.js";

/**
 * Get audit logs with filtering and pagination
 * @param {Object} filters - Filter options
 * @param {number} filters.userId - Filter by user ID
 * @param {string} filters.action - Filter by action type
 * @param {string} filters.resourceType - Filter by resource type
 * @param {string} filters.startDate - Filter by start date (ISO string)
 * @param {string} filters.endDate - Filter by end date (ISO string)
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 50)
 * @returns {Promise<Object>} - Paginated audit logs with metadata
 */
export const getAuditLogs = async (filters = {}) => {
  const {
    userId,
    action,
    resourceType,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = filters;

  // Build dynamic WHERE clause
  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (userId) {
    conditions.push(`al.user_id = $${paramCount++}`);
    params.push(parseInt(userId));
  }

  if (action) {
    conditions.push(`al.action = $${paramCount++}`);
    params.push(action);
  }

  if (resourceType) {
    conditions.push(`al.resource_type = $${paramCount++}`);
    params.push(resourceType);
  }

  if (startDate) {
    conditions.push(`al.created_at >= $${paramCount++}`);
    params.push(new Date(startDate));
  }

  if (endDate) {
    conditions.push(`al.created_at <= $${paramCount++}`);
    params.push(new Date(endDate));
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Calculate pagination
  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  // Execute queries in parallel
  const [logsResult, countResult] = await Promise.all([
    pool.query(
      `
      SELECT 
        al.audit_log_id,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.ip_address,
        al.metadata,
        al.created_at,
        json_build_object(
          'userId', u.user_id,
          'email', u.email
        ) as user
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `,
      [...params, take, skip],
    ),
    pool.query(
      `
      SELECT COUNT(*) as count
      FROM audit_logs al
      ${whereClause}
    `,
      params,
    ),
  ]);

  // Transform results to camelCase
  const logs = logsResult.rows.map((row) => ({
    auditLogId: row.audit_log_id,
    userId: row.user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ipAddress: row.ip_address,
    metadata: row.metadata,
    createdAt: row.created_at,
    user: row.user,
  }));

  const total = parseInt(countResult.rows[0].count);

  return {
    logs,
    total,
    page: parseInt(page),
    limit: take,
    totalPages: Math.ceil(total / take),
  };
};

/**
 * Get audit log by ID
 * @param {number} auditLogId - Audit log ID
 * @returns {Promise<Object|null>} - Audit log or null
 */
export const getAuditLogById = async (auditLogId) => {
  const result = await pool.query(
    `
    SELECT 
      al.audit_log_id,
      al.user_id,
      al.action,
      al.resource_type,
      al.resource_id,
      al.ip_address,
      al.metadata,
      al.created_at,
      json_build_object(
        'userId', u.user_id,
        'email', u.email
      ) as user
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.user_id
    WHERE al.audit_log_id = $1
  `,
    [parseInt(auditLogId)],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    auditLogId: row.audit_log_id,
    userId: row.user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ipAddress: row.ip_address,
    metadata: row.metadata,
    createdAt: row.created_at,
    user: row.user,
  };
};

/**
 * Get audit logs for a specific user
 * @param {number} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} - Paginated audit logs
 */
export const getUserAuditLogs = async (userId, options = {}) => {
  return await getAuditLogs({
    ...options,
    userId,
  });
};

/**
 * Get audit logs for a specific resource
 * @param {string} resourceType - Resource type
 * @param {number} resourceId - Resource ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} - Paginated audit logs
 */
export const getResourceAuditLogs = async (
  resourceType,
  resourceId,
  options = {},
) => {
  const { page = 1, limit = 50 } = options;

  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  const [logsResult, countResult] = await Promise.all([
    pool.query(
      `
      SELECT 
        al.audit_log_id,
        al.user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.ip_address,
        al.metadata,
        al.created_at,
        json_build_object(
          'userId', u.user_id,
          'email', u.email
        ) as user
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      WHERE al.resource_type = $1 AND al.resource_id = $2
      ORDER BY al.created_at DESC
      LIMIT $3 OFFSET $4
    `,
      [resourceType, parseInt(resourceId), take, skip],
    ),
    pool.query(
      `
      SELECT COUNT(*) as count
      FROM audit_logs al
      WHERE al.resource_type = $1 AND al.resource_id = $2
    `,
      [resourceType, parseInt(resourceId)],
    ),
  ]);

  // Transform results to camelCase
  const logs = logsResult.rows.map((row) => ({
    auditLogId: row.audit_log_id,
    userId: row.user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ipAddress: row.ip_address,
    metadata: row.metadata,
    createdAt: row.created_at,
    user: row.user,
  }));

  const total = parseInt(countResult.rows[0].count);

  return {
    logs,
    total,
    page: parseInt(page),
    limit: take,
    totalPages: Math.ceil(total / take),
  };
};

/**
 * Create a new audit log entry
 * @param {Object} payload - Audit log payload
 * @returns {Promise<Object>} - Created audit log
 */
export const createAuditLog = async (payload) => {
  const userId = payload.userId ?? payload.user_id;
  const action = payload.action;
  const resourceType = payload.resourceType ?? payload.resource_type;
  const resourceId = payload.resourceId ?? payload.resource_id ?? null;
  const ipAddress = payload.ipAddress ?? payload.ip_address ?? null;
  const metadata = payload.metadata ?? {};

  const insertResult = await pool.query(
    `
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING audit_log_id
    `,
    [parseInt(userId), action, resourceType, resourceId, ipAddress, metadata],
  );

  return getAuditLogById(insertResult.rows[0].audit_log_id);
};

/**
 * Update an existing audit log entry
 * @param {number} auditLogId - Audit log ID
 * @param {Object} payload - Audit log fields to update
 * @returns {Promise<Object|null>} - Updated audit log or null when not found
 */
export const updateAuditLog = async (auditLogId, payload) => {
  const updates = [];
  const values = [];
  let paramCount = 1;

  const userId = payload.userId ?? payload.user_id;
  const action = payload.action;
  const resourceType = payload.resourceType ?? payload.resource_type;
  const hasResourceIdField =
    Object.prototype.hasOwnProperty.call(payload, "resourceId") ||
    Object.prototype.hasOwnProperty.call(payload, "resource_id");
  const resourceId = payload.resourceId ?? payload.resource_id;
  const hasIpAddressField =
    Object.prototype.hasOwnProperty.call(payload, "ipAddress") ||
    Object.prototype.hasOwnProperty.call(payload, "ip_address");
  const ipAddress = payload.ipAddress ?? payload.ip_address;
  const hasMetadataField = Object.prototype.hasOwnProperty.call(
    payload,
    "metadata",
  );

  if (userId !== undefined) {
    updates.push(`user_id = $${paramCount++}`);
    values.push(parseInt(userId));
  }

  if (action !== undefined) {
    updates.push(`action = $${paramCount++}`);
    values.push(action);
  }

  if (resourceType !== undefined) {
    updates.push(`resource_type = $${paramCount++}`);
    values.push(resourceType);
  }

  if (hasResourceIdField) {
    updates.push(`resource_id = $${paramCount++}`);
    values.push(resourceId ?? null);
  }

  if (hasIpAddressField) {
    updates.push(`ip_address = $${paramCount++}`);
    values.push(ipAddress ?? null);
  }

  if (hasMetadataField) {
    updates.push(`metadata = $${paramCount++}`);
    values.push(payload.metadata ?? {});
  }

  if (updates.length === 0) {
    return getAuditLogById(auditLogId);
  }

  values.push(parseInt(auditLogId));

  const result = await pool.query(
    `
      UPDATE audit_logs
      SET ${updates.join(", ")}
      WHERE audit_log_id = $${paramCount}
      RETURNING audit_log_id
    `,
    values,
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getAuditLogById(result.rows[0].audit_log_id);
};

/**
 * Delete an audit log entry
 * @param {number} auditLogId - Audit log ID
 * @returns {Promise<boolean>} - True when deleted
 */
export const deleteAuditLog = async (auditLogId) => {
  const result = await pool.query(
    `
      DELETE FROM audit_logs
      WHERE audit_log_id = $1
      RETURNING audit_log_id
    `,
    [parseInt(auditLogId)],
  );

  return result.rows.length > 0;
};
