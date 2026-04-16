import axiosInstance from "./axiosInstance";

const classApi = {
  getAll: () => axiosInstance.get("/classes"),
  getById: (id) => axiosInstance.get(`/classes/${id}`),
  getByTerm: (termId) => axiosInstance.get(`/classes/term/${termId}`),
  create: (payload) => axiosInstance.post("/classes", payload),
  update: (id, payload) => axiosInstance.put(`/classes/${id}`, payload),
  remove: (id) => axiosInstance.delete(`/classes/${id}`),
  publishResults: (id) => axiosInstance.post(`/classes/${id}/publish-results`),
  getSubjects: (id) => axiosInstance.get(`/classes/${id}/subjects`),
  addSubject: (id, payload) => axiosInstance.post(`/classes/${id}/subjects`, payload),
  removeSubject: (id, subjectId) => axiosInstance.delete(`/classes/${id}/subjects/${subjectId}`),
  getEnrollments: (id) => axiosInstance.get(`/classes/${id}/enrollments`),
};

export default classApi;
