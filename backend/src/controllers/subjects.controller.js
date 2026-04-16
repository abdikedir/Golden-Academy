import { subjectsService } from "../services/subjects.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { ApiError } from "../utils/ApiError.js";

export const subjectsController = {
  list: catchAsync(async (req, res) => {
    // Department admins can only see subjects in their department
    const filters = {};
    if (req.user.roles.includes('DEPARTMENT_ADMIN') && req.user.departmentId) {
      filters.departmentId = req.user.departmentId;
    }
    
    const subjects = await subjectsService.list(filters);
    res.json(subjects);
  }),

  getById: catchAsync(async (req, res) => {
    const subject = await subjectsService.getById(req.params.id);
    res.json(subject);
  }),

  create: catchAsync(async (req, res) => {
    const subject = await subjectsService.create(req.body);
    res.status(201).json(subject);
  }),

  update: catchAsync(async (req, res) => {
    const subject = await subjectsService.update(req.params.id, req.body);
    res.json(subject);
  }),

  remove: catchAsync(async (req, res) => {
    await subjectsService.remove(req.params.id);
    res.status(204).send();
  })
};
