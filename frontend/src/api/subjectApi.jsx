import axiosInstance from "./axiosInstance";

const subjectApi = {
  getAll: () => axiosInstance.get("/subjects"),
  getByDepartment: (departmentId) =>
    axiosInstance.get("/subjects", { params: { departmentId } }),
  getById: (id) => axiosInstance.get(`/subjects/${id}`),
  create: (payload) => axiosInstance.post("/subjects", payload),
  update: (id, payload) => axiosInstance.put(`/subjects/${id}`, payload),
  remove: (id) => axiosInstance.delete(`/subjects/${id}`),
};

export default subjectApi;
