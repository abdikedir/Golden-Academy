import axios from "axios";
import { expandCaseAliases } from "./caseCompat";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  pendingQueue = [];
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data && typeof config.data === "object") {
      config.data = expandCaseAliases(config.data);
    }

    if (config.params && typeof config.params === "object") {
      config.params = expandCaseAliases(config.params);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => {
    if (response?.data && typeof response.data === "object") {
      response.data = expandCaseAliases(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = localStorage.getItem("refreshToken");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      refreshToken
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newToken = response.data?.data?.accessToken;
        if (!newToken) {
          throw new Error("Refresh token endpoint did not return accessToken");
        }

        localStorage.setItem("accessToken", newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authUser");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
