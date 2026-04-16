import axiosInstance from "./axiosInstance";

const marksApi = {
  getAll: (params = {}) => axiosInstance.get("/marks", { params }),
  getById: (id) => axiosInstance.get(`/marks/${id}`),
  getByClass: (classId, params = {}) =>
    axiosInstance.get(`/marks/class/${classId}`, { params }),
  getByStudent: (studentId, params = {}) =>
    axiosInstance.get(`/marks/student/${studentId}`, { params }),
  getByTeacher: (teacherId, params = {}) =>
    axiosInstance.get(`/marks/teacher/${teacherId}`, { params }),
  getMine: (params = {}) => axiosInstance.get("/marks/mine", { params }),
  submitMark: (payload) => axiosInstance.post("/marks/submit", payload),
  updateMarkByTeacher: (id, payload) =>
    axiosInstance.put(`/marks/${id}/teacher-update`, payload),
  create: (payload) => axiosInstance.post("/marks", payload),
  update: (id, payload) => axiosInstance.put(`/marks/${id}`, payload),
  remove: (id) => axiosInstance.delete(`/marks/${id}`),
};

export default marksApi;
