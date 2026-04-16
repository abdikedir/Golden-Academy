import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";
import { marksService } from "../services/marks.service.js";

export const marksController = {
  list: catchAsync(async (req, res) => {
    const data = await marksService.list(req.query);
    return sendResponse(res, 200, "Marks retrieved", data);
  }),

  getById: catchAsync(async (req, res) => {
    const data = await marksService.getById(req.params.id);
    return sendResponse(res, 200, "Mark retrieved", data);
  }),

  getByClassId: catchAsync(async (req, res) => {
    const data = await marksService.getByClassId(req.params.classId);
    return sendResponse(res, 200, "Class marks retrieved", data);
  }),

  getByStudentId: catchAsync(async (req, res) => {
    const data = await marksService.getByStudentId(
      req.params.studentId,
      req.query.termId,
    );
    return sendResponse(res, 200, "Student marks retrieved", data);
  }),

  getByTeacherId: catchAsync(async (req, res) => {
    const isElevatedRole =
      req.user.roles.includes("SYSTEM_ADMIN") ||
      req.user.roles.includes("DEPARTMENT_ADMIN") ||
      req.user.roles.includes("REGISTRAR");

    let requestedTeacherId = req.params.teacherId;

    if (!isElevatedRole) {
      const authTeacherId = req.user.teacher?.teacherId;
      if (!authTeacherId) {
        return sendResponse(res, 403, "Teacher profile required", null);
      }

      if (parseInt(req.params.teacherId, 10) !== parseInt(authTeacherId, 10)) {
        return sendResponse(res, 403, "You can only view your own marks", null);
      }

      requestedTeacherId = authTeacherId;
    }

    const data = await marksService.getByTeacherId(requestedTeacherId);
    return sendResponse(res, 200, "Teacher marks retrieved", data);
  }),

  getMine: catchAsync(async (req, res) => {
    const teacherId = req.user.teacher?.teacherId;

    if (!teacherId) {
      return sendResponse(res, 403, "Teacher profile required", null);
    }

    const data = await marksService.getByTeacherId(teacherId);
    return sendResponse(res, 200, "Teacher marks retrieved", data);
  }),

  submitMark: catchAsync(async (req, res) => {
    const isElevatedRole =
      req.user.roles.includes("SYSTEM_ADMIN") ||
      req.user.roles.includes("DEPARTMENT_ADMIN") ||
      req.user.roles.includes("REGISTRAR");

    const authTeacherId = req.user.teacher?.teacherId;
    const requestedTeacherId = req.body.teacherId ?? req.body.teacher_id;
    const effectiveTeacherId = isElevatedRole
      ? requestedTeacherId
      : authTeacherId;

    if (!effectiveTeacherId) {
      return sendResponse(res, 403, "Teacher profile required", null);
    }

    const data = await marksService.submitMark({
      studentId: req.body.studentId ?? req.body.student_id,
      teacherId: effectiveTeacherId,
      enrollmentId: req.body.enrollmentId ?? req.body.enrollment_id,
      subjectId: req.body.subjectId ?? req.body.subject_id,
      markObtained: req.body.markObtained ?? req.body.mark_obtained,
      allowOverwrite: isElevatedRole,
    });
    return sendResponse(res, 201, "Mark submitted", data);
  }),

  updateMarkByTeacher: catchAsync(async (req, res) => {
    const isElevatedRole =
      req.user.roles.includes("SYSTEM_ADMIN") ||
      req.user.roles.includes("DEPARTMENT_ADMIN") ||
      req.user.roles.includes("REGISTRAR");

    const authTeacherId = req.user.teacher?.teacherId;
    const requestedTeacherId = req.body.teacherId ?? req.body.teacher_id;
    const effectiveTeacherId = isElevatedRole
      ? requestedTeacherId
      : authTeacherId;

    if (!effectiveTeacherId) {
      return sendResponse(res, 403, "Teacher profile required", null);
    }

    const data = await marksService.updateMarkByTeacher({
      markId: req.params.id,
      teacherId: effectiveTeacherId,
      markObtained: req.body.markObtained ?? req.body.mark_obtained,
    });
    return sendResponse(res, 200, "Mark updated", data);
  }),

  create: catchAsync(async (req, res) => {
    const data = await marksService.create(req.body);
    return sendResponse(res, 201, "Mark created", data);
  }),

  update: catchAsync(async (req, res) => {
    const data = await marksService.update(req.params.id, req.body);
    return sendResponse(res, 200, "Mark updated", data);
  }),

  remove: catchAsync(async (req, res) => {
    await marksService.remove(req.params.id);
    return sendResponse(res, 200, "Mark deleted", null);
  }),
};
