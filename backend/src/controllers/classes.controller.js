import { catchAsync } from "../utils/catchAsync.js";
import { sendResponse } from "../utils/response.js";
import { classesService } from "../services/classes.service.js";

export const classesController = {
  list: catchAsync(async (req, res) => {
    const data = await classesService.getAll();
    return sendResponse(res, 200, "Classes retrieved successfully", data);
  }),

  getById: catchAsync(async (req, res) => {
    const data = await classesService.getById(req.params.id);
    return sendResponse(res, 200, "Class retrieved successfully", data);
  }),

  create: catchAsync(async (req, res) => {
    const data = await classesService.create(req.body);
    return sendResponse(res, 201, "Class created successfully", data);
  }),

  update: catchAsync(async (req, res) => {
    const data = await classesService.update(req.params.id, req.body);
    return sendResponse(res, 200, "Class updated successfully", data);
  }),

  remove: catchAsync(async (req, res) => {
    await classesService.delete(req.params.id);
    return sendResponse(res, 200, "Class deleted successfully");
  }),

  publishResults: catchAsync(async (req, res) => {
    const data = await classesService.publishResults(req.params.id);
    return sendResponse(res, 200, "Class results published", data);
  }),

  checkMarksComplete: catchAsync(async (req, res) => {
    const data = await classesService.checkMarksComplete(req.params.id);
    return sendResponse(res, 200, "Mark completion status retrieved", data);
  }),

  getSubjects: catchAsync(async (req, res) => {
    const data = await classesService.getSubjects(req.params.id);
    return sendResponse(
      res,
      200,
      "Class subjects retrieved successfully",
      data,
    );
  }),

  addSubject: catchAsync(async (req, res) => {
    const subjectId = req.body.subjectId ?? req.body.subject_id;
    const data = await classesService.addSubject(
      req.params.id,
      subjectId,
      req.user,
    );
    return sendResponse(res, 201, "Subject added to class successfully", data);
  }),

  removeSubject: catchAsync(async (req, res) => {
    const data = await classesService.removeSubject(
      req.params.id,
      req.params.subjectId,
    );
    return sendResponse(
      res,
      200,
      "Subject removed from class successfully",
      data,
    );
  }),
};
