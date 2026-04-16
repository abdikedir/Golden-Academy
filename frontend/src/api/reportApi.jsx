import axiosInstance from "./axiosInstance";

const reportApi = {
  getAcademicReport: (params = {}) =>
    axiosInstance.get("/reports/academic", { params }),
  getClassReport: (classId, params = {}) =>
    axiosInstance.get(`/reports/class/${classId}`, { params }),
  getStudentReport: (studentId, params = {}) =>
    axiosInstance.get(`/reports/student/${studentId}`, { params }),
  getDepartmentReport: (departmentId, params = {}) =>
    axiosInstance.get(`/reports/department/${departmentId}`, { params }),
  getClassRankings: (classId, params = {}) =>
    axiosInstance.get(`/reports/class/${classId}/rankings`, { params }),
  getMarkCompletionStatus: (classId) =>
    axiosInstance.get(`/reports/class/${classId}/completion`),
  getStudentAverages: (classId) =>
    axiosInstance.get(`/reports/class/${classId}/averages`),
  getPendingSubjects: (classId) =>
    axiosInstance.get(`/reports/class/${classId}/pending-subjects`),
};

export default reportApi;
