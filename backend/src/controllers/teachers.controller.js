import { teachersService } from "../services/teachers.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";

export const teachersController = {
  list: catchAsync(async (req, res) => {
    const departmentId = req.query.departmentId ?? req.query.department_id;

    // If user is DEPARTMENT_ADMIN, filter by their department
    const filters = {};
    if (req.user.roles.includes("DEPARTMENT_ADMIN")) {
      filters.departmentId = req.user.departmentId;
    } else if (departmentId) {
      filters.departmentId = departmentId;
    }

    const teachers = await teachersService.list(filters);
    return sendResponse(res, 200, "Teachers retrieved successfully", teachers);
  }),

  getById: catchAsync(async (req, res) => {
    const teacher = await teachersService.getById(req.params.id);
    return sendResponse(res, 200, "Teacher retrieved successfully", teacher);
  }),

  create: catchAsync(async (req, res) => {
    const requestedRole = req.body.roleName ?? req.body.role_name ?? "TEACHER";
    if (
      req.user.roles.includes("DEPARTMENT_ADMIN") &&
      requestedRole !== "TEACHER"
    ) {
      throw new ApiError(
        403,
        "Department admins can only create teacher accounts with TEACHER role",
      );
    }

    const teacher = await teachersService.create(req.body);
    return sendResponse(res, 201, "Teacher created successfully", teacher);
  }),

  update: catchAsync(async (req, res) => {
    const teacher = await teachersService.update(req.params.id, req.body);
    return sendResponse(res, 200, "Teacher updated successfully", teacher);
  }),

  remove: catchAsync(async (req, res) => {
    await teachersService.remove(req.params.id);
    return sendResponse(res, 200, "Teacher deleted successfully", null);
  }),

  assignToSubject: catchAsync(async (req, res) => {
    const { id } = req.params;
    const classSubjectId = req.body.classSubjectId ?? req.body.class_subject_id;

    const assignment = await teachersService.assignToSubject(
      id,
      classSubjectId,
      req.user,
    );

    return sendResponse(
      res,
      201,
      "Teacher assigned to subject successfully",
      assignment,
    );
  }),

  removeFromSubject: catchAsync(async (req, res) => {
    const { id, classSubjectId } = req.params;

    await teachersService.removeFromSubject(id, classSubjectId);
    return sendResponse(
      res,
      200,
      "Teacher removed from subject successfully",
      null,
    );
  }),

  getAssignments: catchAsync(async (req, res) => {
    const { id } = req.params;
    const assignments = await teachersService.getAssignments(id);
    return sendResponse(
      res,
      200,
      "Teacher assignments retrieved successfully",
      assignments,
    );
  }),

  getHomeroomClass: catchAsync(async (req, res) => {
    const { id } = req.params;
    const homeroomClass = await teachersService.getHomeroomClass(id);
    return sendResponse(
      res,
      200,
      "Homeroom class retrieved successfully",
      homeroomClass,
    );
  }),

  getMyAssignments: catchAsync(async (req, res) => {
    const teacherId = req.user.teacher?.teacherId;

    if (!teacherId) {
      throw new ApiError(403, "Teacher profile required");
    }

    const assignments = await teachersService.getAssignments(teacherId);
    return sendResponse(
      res,
      200,
      "Teacher assignments retrieved successfully",
      assignments,
    );
  }),

  getMyHomeroomClass: catchAsync(async (req, res) => {
    const teacherId = req.user.teacher?.teacherId;

    if (!teacherId) {
      throw new ApiError(403, "Teacher profile required");
    }

    const homeroomClass = await teachersService.getHomeroomClass(teacherId);
    return sendResponse(
      res,
      200,
      "Homeroom class retrieved successfully",
      homeroomClass,
    );
  }),
};
