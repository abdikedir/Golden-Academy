import axiosInstance from "./axiosInstance";

const authApi = {
  login: (payload) => axiosInstance.post("/auth/login", payload),
  register: (payload) => axiosInstance.post("/auth/register", payload),
  refresh: (payload) => axiosInstance.post("/auth/refresh", payload),
};

export default authApi;
