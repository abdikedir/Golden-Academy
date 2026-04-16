import axiosInstance from "./axiosInstance";

const termApi = {
  getAll: () => axiosInstance.get("/terms"),
  getById: (id) => axiosInstance.get(`/terms/${id}`),
  create: (payload) => axiosInstance.post("/terms", payload),
  update: (id, payload) => axiosInstance.put(`/terms/${id}`, payload),
  remove: (id) => axiosInstance.delete(`/terms/${id}`),
};

export default termApi;
