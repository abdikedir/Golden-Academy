import { ApiError } from "../utils/ApiError.js";
import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";
import {
  createAuditLog,
  deleteAuditLog,
  getAuditLogById,
  getAuditLogs,
  getUserAuditLogs,
  updateAuditLog,
} from "../services/audit.service.js";

const toSnakeAuditLog = (log) => ({
  audit_log_id: log.auditLogId,
  user_id: log.userId,
  action: log.action,
  resource_type: log.resourceType,
  resource_id: log.resourceId,
  ip_address: log.ipAddress,
  metadata: log.metadata,
  created_at: log.createdAt,
  user: log.user
    ? {
        user_id: log.user.userId,
        email: log.user.email,
      }
    : null,
});

const toSnakePaginatedResult = (result) => ({
  logs: result.logs.map(toSnakeAuditLog),
  total: result.total,
  page: result.page,
  limit: result.limit,
  total_pages: result.totalPages,
});

const buildFilters = (query = {}) => ({
  userId: query.userId,
  action: query.action,
  resourceType: query.resourceType,
  startDate: query.startDate,
  endDate: query.endDate,
  page: query.page,
  limit: query.limit,
});

const toCsv = (logs) => {
  const headers = [
    "audit_log_id",
    "user_id",
    "user_email",
    "action",
    "resource_type",
    "resource_id",
    "ip_address",
    "created_at",
    "metadata",
  ];

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = logs.map((log) => {
    const values = [
      log.audit_log_id,
      log.user_id,
      log.user?.email || "",
      log.action,
      log.resource_type,
      log.resource_id,
      log.ip_address,
      log.created_at,
      JSON.stringify(log.metadata || {}),
    ];

    return values.map(escapeCsvValue).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
};

export const auditController = {
  create: catchAsync(async (req, res) => {
    const data = await createAuditLog({
      ...req.body,
      userId: req.body.userId ?? req.user?.userId,
    });

    return sendResponse(
      res,
      201,
      "Audit log created successfully",
      toSnakeAuditLog(data),
    );
  }),

  list: catchAsync(async (req, res) => {
    const data = await getAuditLogs(buildFilters(req.query));
    return sendResponse(
      res,
      200,
      "Audit logs fetched successfully",
      toSnakePaginatedResult(data),
    );
  }),

  getById: catchAsync(async (req, res) => {
    const data = await getAuditLogById(req.params.id);
    if (!data) {
      throw new ApiError(404, "Audit log not found");
    }

    return sendResponse(
      res,
      200,
      "Audit log fetched successfully",
      toSnakeAuditLog(data),
    );
  }),

  update: catchAsync(async (req, res) => {
    const data = await updateAuditLog(req.params.id, req.body);

    if (!data) {
      throw new ApiError(404, "Audit log not found");
    }

    return sendResponse(
      res,
      200,
      "Audit log updated successfully",
      toSnakeAuditLog(data),
    );
  }),

  remove: catchAsync(async (req, res) => {
    const deleted = await deleteAuditLog(req.params.id);

    if (!deleted) {
      throw new ApiError(404, "Audit log not found");
    }

    return sendResponse(res, 200, "Audit log deleted successfully", null);
  }),

  getByUser: catchAsync(async (req, res) => {
    const data = await getUserAuditLogs(req.params.userId, {
      action: req.query.action,
      resourceType: req.query.resourceType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
    });

    return sendResponse(
      res,
      200,
      "User audit logs fetched successfully",
      toSnakePaginatedResult(data),
    );
  }),

  getByAction: catchAsync(async (req, res) => {
    const data = await getAuditLogs({
      ...buildFilters(req.query),
      action: req.params.action,
    });

    return sendResponse(
      res,
      200,
      "Action audit logs fetched successfully",
      toSnakePaginatedResult(data),
    );
  }),

  getByResourceType: catchAsync(async (req, res) => {
    const data = await getAuditLogs({
      ...buildFilters(req.query),
      resourceType: req.params.resourceType,
    });

    return sendResponse(
      res,
      200,
      "Resource audit logs fetched successfully",
      toSnakePaginatedResult(data),
    );
  }),

  getByDateRange: catchAsync(async (req, res) => {
    const data = await getAuditLogs(buildFilters(req.query));
    return sendResponse(
      res,
      200,
      "Date range audit logs fetched successfully",
      toSnakePaginatedResult(data),
    );
  }),

  exportLogs: catchAsync(async (req, res) => {
    const data = await getAuditLogs({
      ...buildFilters(req.query),
      page: 1,
      limit: req.query.limit || 1000,
    });

    const logs = data.logs.map(toSnakeAuditLog);
    const csv = toCsv(logs);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-logs-${Date.now()}.csv"`,
    );

    return res.status(200).send(csv);
  }),
};
