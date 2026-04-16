import axiosInstance from "./axiosInstance";

const teacherApi = {
  getAll: () => axiosInstance.get("/teachers"),
  getById: (id) => axiosInstance.get(`/teachers/${id}`),
  getByDepartment: (departmentId) =>
    axiosInstance.get("/teachers", { params: { departmentId } }),
  create: (payload) => axiosInstance.post("/teachers", payload),
  update: (id, payload) => axiosInstance.put(`/teachers/${id}`, payload),
  remove: (id) => axiosInstance.delete(`/teachers/${id}`),
  assignToSubject: (payload) => {
    const teacherId = payload?.teacherId ?? payload?.teacher_id;
    const classSubjectId = payload?.classSubjectId ?? payload?.class_subject_id;
    return axiosInstance.post(`/teachers/${teacherId}/assign`, {
      classSubjectId,
    });
  },
  removeFromSubject: (teacherId, classSubjectId) =>
    axiosInstance.delete(`/teachers/${teacherId}/assign/${classSubjectId}`),
  getMyAssignments: () => axiosInstance.get("/teachers/me/assignments"),
  getMyHomeroomClass: () => axiosInstance.get("/teachers/me/homeroom-class"),
  getAssignments: (teacherId) =>
    axiosInstance.get(`/teachers/${teacherId}/assignments`),
  getHomeroomClass: (teacherId) =>
    axiosInstance.get(`/teachers/${teacherId}/homeroom-class`),
};

export default teacherApi;
