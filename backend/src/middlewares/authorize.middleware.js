import { ApiError } from "../utils/ApiError.js";
import { catchAsync } from "../utils/catchAsync.js";
import pool from "../config/db.js";

/**
 * Role-based authorization middleware
 * Checks if the authenticated user has one of the allowed roles
 */
export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user?.userId) {
      return next(new ApiError(401, "Authentication required"));
    }

    // req.user.roles is already populated by authenticate middleware
    const hasRole = allowedRoles.some((role) => req.user.roles.includes(role));

    if (!hasRole) {
      return next(new ApiError(403, "Insufficient permissions"));
    }

    next();
  };
};

/**
 * Department-scoped authorization middleware
 * Restricts department admins to resources within their department
 * System admins bypass this check
 */
export const authorizeDepartmentAdmin = catchAsync(async (req, _res, next) => {
  // System admins have unrestricted access
  if (req.user.roles.includes("SYSTEM_ADMIN")) {
    return next();
  }

  // Only apply restrictions to department admins
  if (!req.user.roles.includes("DEPARTMENT_ADMIN")) {
    return next();
  }

  // Department admin must have a department
  if (!req.user.departmentId) {
    throw new ApiError(
      403,
      "Department admin must be associated with a department",
    );
  }

  // Extract resource department ID from request
  const resourceDepartmentId = await getResourceDepartmentId(req);

  // If resource has a department, verify it matches the admin's department
  if (resourceDepartmentId && resourceDepartmentId !== req.user.departmentId) {
    throw new ApiError(403, "Access restricted to your department");
  }

  next();
});

/**
 * Department self-scope middleware
 * Allows DEPARTMENT_ADMIN to manage only their own department resource
 * SYSTEM_ADMIN bypasses this check
 */
export const authorizeDepartmentSelf = catchAsync(async (req, _res, next) => {
  if (req.user.roles.includes("SYSTEM_ADMIN")) {
    return next();
  }

  if (!req.user.roles.includes("DEPARTMENT_ADMIN")) {
    return next();
  }

  if (!req.user.departmentId) {
    throw new ApiError(
      403,
      "Department admin must be associated with a department",
    );
  }

  const targetDepartmentId = parseInt(req.params.id, 10);
  if (Number.isNaN(targetDepartmentId) || targetDepartmentId < 1) {
    throw new ApiError(400, "Valid department ID is required");
  }

  if (parseInt(req.user.departmentId, 10) !== targetDepartmentId) {
    throw new ApiError(403, "Access restricted to your department");
  }

  next();
});

/**
 * Teacher-subject authorization middleware
 * Verifies teacher is assigned to teach the subject in the specified class
 */
export const authorizeTeacherForSubject = catchAsync(
  async (req, _res, next) => {
    if (
      req.user.roles.includes("SYSTEM_ADMIN") ||
      req.user.roles.includes("DEPARTMENT_ADMIN") ||
      req.user.roles.includes("REGISTRAR")
    ) {
      return next();
    }

    const { classId, subjectId } = req.params;
    const teacherId = req.user.teacher?.teacherId;

    if (teacherId === undefined || teacherId === null) {
      throw new ApiError(403, "Teacher profile required");
    }

    // Verify teacher is assigned to teach this subject in this class
    const result = await pool.query(
      `
    SELECT tcs.teacher_class_subject_id
    FROM teacher_class_subject tcs
    JOIN class_subjects cs ON tcs.class_subject_id = cs.class_subject_id
    WHERE tcs.teacher_id = $1
      AND cs.class_id = $2
      AND cs.subject_id = $3
    LIMIT 1
  `,
      [parseInt(teacherId), parseInt(classId), parseInt(subjectId)],
    );

    if (result.rows.length === 0) {
      throw new ApiError(
        403,
        "Not authorized to teach this subject in this class",
      );
    }

    next();
  },
);

/**
 * Teacher-class authorization middleware
 * Verifies teacher is assigned to at least one subject in the specified class.
 */
export const authorizeTeacherForClass = catchAsync(async (req, _res, next) => {
  if (
    req.user.roles.includes("SYSTEM_ADMIN") ||
    req.user.roles.includes("DEPARTMENT_ADMIN") ||
    req.user.roles.includes("REGISTRAR")
  ) {
    return next();
  }

  const classId =
    req.params.classId ??
    req.query.classId ??
    req.query.class_id ??
    req.body.classId ??
    req.body.class_id;
  const teacherId = req.user.teacher?.teacherId;

  if (!classId) {
    throw new ApiError(400, "Class ID is required for teacher scope check");
  }

  if (teacherId === undefined || teacherId === null) {
    throw new ApiError(403, "Teacher profile required");
  }

  const result = await pool.query(
    `
      SELECT 1
      FROM classes c
      WHERE c.class_id = $2
        AND (
          c.homeroom_teacher_id = $1
          OR EXISTS (
            SELECT 1
            FROM teacher_class_subject tcs
            JOIN class_subjects cs ON tcs.class_subject_id = cs.class_subject_id
            WHERE tcs.teacher_id = $1
              AND cs.class_id = $2
          )
        )
      LIMIT 1
    `,
    [parseInt(teacherId, 10), parseInt(classId, 10)],
  );

  if (result.rows.length === 0) {
    throw new ApiError(403, "Not authorized for this class");
  }

  next();
});

/**
 * Homeroom teacher authorization middleware
 * Verifies teacher is the homeroom teacher for the specified class
 */
export const authorizeHomeroomTeacher = catchAsync(async (req, _res, next) => {
  if (
    req.user.roles.includes("SYSTEM_ADMIN") ||
    req.user.roles.includes("DEPARTMENT_ADMIN") ||
    req.user.roles.includes("REGISTRAR")
  ) {
    return next();
  }

  const classId = req.params.classId ?? req.params.id;
  const teacherId = req.user.teacher?.teacherId;

  if (!classId) {
    throw new ApiError(400, "Class ID is required for homeroom check");
  }

  if (teacherId === undefined || teacherId === null) {
    throw new ApiError(403, "Teacher profile required");
  }

  // Verify teacher is the homeroom teacher for this class
  const result = await pool.query(
    `
    SELECT class_id, homeroom_teacher_id
    FROM classes
    WHERE class_id = $1
  `,
    [parseInt(classId)],
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "Class not found");
  }

  const classData = result.rows[0];
  if (parseInt(classData.homeroom_teacher_id, 10) !== parseInt(teacherId, 10)) {
    throw new ApiError(403, "Only homeroom teacher can perform this action");
  }

  next();
});

/**
 * Helper function to extract department ID from various resource types
 */
async function getResourceDepartmentId(req) {
  const { subjectId, teacherId, id } = req.params;
  const bodyDepartmentId = req.body?.departmentId;

  // Direct department ID in params or body
  if (bodyDepartmentId) return parseInt(bodyDepartmentId);

  // Subject resource
  if (subjectId) {
    const result = await pool.query(
      "SELECT department_id FROM subjects WHERE subject_id = $1",
      [parseInt(subjectId)],
    );
    return result.rows.length > 0 ? result.rows[0].department_id : null;
  }

  // Teacher resource (check both teacherId param and id param for teacher routes)
  const teacherIdToCheck =
    teacherId || (req.path.includes("/teachers") ? id : null);
  if (teacherIdToCheck) {
    const result = await pool.query(
      "SELECT department_id FROM teachers WHERE teacher_id = $1",
      [parseInt(teacherIdToCheck)],
    );
    return result.rows.length > 0 ? result.rows[0].department_id : null;
  }

  return null;
}
