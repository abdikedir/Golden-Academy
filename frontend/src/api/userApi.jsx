import axiosInstance from "./axiosInstance";

const assertUserId = (id, action) => {
  const normalized = Number(id);
  if (
    id === undefined ||
    id === null ||
    id === "" ||
    Number.isNaN(normalized)
  ) {
    throw new Error(`Cannot ${action}: invalid user id`);
  }
  return normalized;
};

const normalizePayload = (payload = {}) => {
  if (!payload || typeof payload !== "object") return payload;

  const next = { ...payload };

  if (next.isActive === undefined && next.is_active !== undefined) {
    next.isActive = next.is_active;
  }

  if (next.roleId === undefined && next.role_id !== undefined) {
    next.roleId = next.role_id;
  }

  return next;
};

const userApi = {
  getAll: () => axiosInstance.get("/users"),
  getWithRoles: () => axiosInstance.get("/users/with-roles"),
  getById: (id) =>
    axiosInstance.get(`/users/${assertUserId(id, "fetch user")}`),
  create: (payload) => axiosInstance.post("/users", normalizePayload(payload)),
  update: (id, payload) =>
    axiosInstance.put(
      `/users/${assertUserId(id, "update user")}`,
      normalizePayload(payload),
    ),
  remove: (id) =>
    axiosInstance.delete(`/users/${assertUserId(id, "delete user")}`),
  assignRole: (id, payload) =>
    axiosInstance.post(
      `/users/${assertUserId(id, "assign role")}/roles`,
      normalizePayload(payload),
    ),
  removeRole: (id, payload) =>
    axiosInstance.delete(`/users/${assertUserId(id, "remove role")}/roles`, {
      data: normalizePayload(payload),
    }),
};

export default userApi;
