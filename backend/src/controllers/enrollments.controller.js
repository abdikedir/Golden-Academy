import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";
import { enrollmentsService } from "../services/enrollments.service.js";

export const enrollmentsController = {
  list: catchAsync(async (req, res) => {
    const classId = req.query.classId ?? req.query.class_id;
    const termId = req.query.termId ?? req.query.term_id;
    const { page, limit } = req.query;
    const data = await enrollmentsService.list({
      classId,
      termId,
      page,
      limit,
    });
    return sendResponse(res, 200, "Enrollments fetched", data);
  }),

  enrollStudent: catchAsync(async (req, res) => {
    const payload = {
      ...req.body,
      studentId: req.body.studentId ?? req.body.student_id,
      classId: req.body.classId ?? req.body.class_id,
    };
    const data = await enrollmentsService.enrollStudent(payload);
    return sendResponse(res, 201, "Student enrolled", data);
  }),

  getEnrollmentHistory: catchAsync(async (req, res) => {
    const { studentId } = req.params;
    const data = await enrollmentsService.getEnrollmentHistory(studentId);
    return sendResponse(res, 200, "Enrollment history fetched", data);
  }),

  promoteStudents: catchAsync(async (req, res) => {
    const data = await enrollmentsService.promoteStudents(req.body);
    return sendResponse(
      res,
      200,
      `Promotion completed: ${data.promotedCount} student(s) moved from ${data.currentClass.className} (${data.currentClass.term.academicYear} Term ${data.currentClass.term.semester}) to ${data.nextClass.className} (${data.nextClass.term.academicYear} Term ${data.nextClass.term.semester}).`,
      data,
    );
  }),
};
