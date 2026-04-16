import axiosInstance from "./axiosInstance";

const studentApi = {
  getAll: () => axiosInstance.get("/students"),
  getById: (id) => axiosInstance.get(`/students/${id}`),
  search: (query) =>
    axiosInstance.get("/students/search", { params: { search: query } }),
  create: (payload) => axiosInstance.post("/students", payload),
  update: (id, payload) => axiosInstance.put(`/students/${id}`, payload),
  remove: (id) => axiosInstance.delete(`/students/${id}`),
  enroll: (payload) => axiosInstance.post("/enrollments", payload),
  promote: (payload) => axiosInstance.post("/enrollments/promote", payload),
  getAllEnrollments: (params) => axiosInstance.get("/enrollments", { params }),
  getEnrollments: (params) => axiosInstance.get("/enrollments", { params }),
  getHistory: (studentId) =>
    axiosInstance.get(`/enrollments/history/${studentId}`),
};

export default studentApi;
