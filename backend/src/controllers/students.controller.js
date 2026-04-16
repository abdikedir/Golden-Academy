import { studentsService } from "../services/students.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";

export const studentsController = {
  list: catchAsync(async (req, res) => {
    const students = await studentsService.list();
    return sendResponse(res, 200, "Students retrieved successfully", students);
  }),

  getById: catchAsync(async (req, res) => {
    const student = await studentsService.getById(req.params.id);
    return sendResponse(res, 200, "Student retrieved successfully", student);
  }),

  create: catchAsync(async (req, res) => {
    const student = await studentsService.create(req.body);
    return sendResponse(res, 201, "Student created successfully", student);
  }),

  update: catchAsync(async (req, res) => {
    const student = await studentsService.update(req.params.id, req.body);
    return sendResponse(res, 200, "Student updated successfully", student);
  }),

  remove: catchAsync(async (req, res) => {
    await studentsService.remove(req.params.id);
    return sendResponse(res, 200, "Student deleted successfully", null);
  }),

  search: catchAsync(async (req, res) => {
    const search = req.query.search ?? req.query.q;
    const page = req.query.page;
    const limit = req.query.limit;
    const result = await studentsService.search(
      search,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
    return sendResponse(
      res,
      200,
      "Students search completed successfully",
      result,
    );
  }),
};
