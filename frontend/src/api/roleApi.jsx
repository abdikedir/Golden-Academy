import axiosInstance from "./axiosInstance";

const roleApi = {
  getAll: () => axiosInstance.get("/roles"),
  getById: (id) => axiosInstance.get(`/roles/${id}`),
  create: (payload) => axiosInstance.post("/roles", payload),
  update: (id, payload) => axiosInstance.put(`/roles/${id}`, payload),
  remove: (id) => axiosInstance.delete(`/roles/${id}`),
};

export default roleApi;
