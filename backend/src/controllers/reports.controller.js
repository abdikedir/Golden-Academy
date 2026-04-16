import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";
import { reportsService } from "../services/reports.service.js";

export const reportsController = {
  getAcademicReport: catchAsync(async (req, res) => {
    const filters = {
      classId: req.query.classId || req.query.class_id,
      academicYear: req.query.academicYear || req.query.academic_year,
      semester: req.query.semester,
    };

    const data = await reportsService.getAcademicReport(filters, req.user);
    return sendResponse(res, 200, "Academic report fetched", data);
  }),

  getClassReport: catchAsync(async (req, res) => {
    const data = await reportsService.getClassReport(
      req.params.classId,
      req.user,
    );
    return sendResponse(res, 200, "Class report fetched", data);
  }),

  getDepartmentReport: catchAsync(async (req, res) => {
    const data = await reportsService.getDepartmentReport(
      req.params.departmentId,
    );
    return sendResponse(res, 200, "Department report fetched", data);
  }),

  getMarkCompletionStatus: catchAsync(async (req, res) => {
    const data = await reportsService.getMarkCompletionStatus(
      req.params.classId,
    );
    return sendResponse(res, 200, "Mark completion status fetched", data);
  }),
};
