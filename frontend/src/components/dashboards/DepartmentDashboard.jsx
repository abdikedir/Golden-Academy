import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import teacherApi from "../../api/teacherApi";
import subjectApi from "../../api/subjectApi";
import reportApi from "../../api/reportApi";
import classApi from "../../api/classApi";
import departmentApi from "../../api/departmentApi";
import studentApi from "../../api/studentApi";
import { extractErrorMessage, extractPayload } from "../../api/responseAdapter";
import Table from "../common/Table";
import TableSection from "../common/TableSection";
import StateView from "../common/StateView";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";
import Select from "../common/Select";
import { useFetch } from "../../hooks/useFetch";
import { useForm } from "../../hooks/useForm";
import { useAuth } from "../../hooks/useAuth";
import { notify } from "../../utils/notifications";

const asInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeTeacher = (row = {}) => ({
  teacherId: row.teacherId ?? row.teacher_id,
  fullName: row.fullName ?? row.full_name ?? "-",
  userId: row.userId ?? row.user_id ?? null,
  userEmail: row.user?.email ?? row.user_email ?? "-",
  departmentId:
    row.departmentId ??
    row.department_id ??
    row.department?.departmentId ??
    null,
  departmentName: row.department?.name ?? row.department_name ?? "-",
});

const normalizeSubject = (row = {}) => ({
  subjectId: row.subjectId ?? row.subject_id,
  name: row.name ?? "-",
  code: row.code ?? "-",
  totalMark: row.totalMark ?? row.total_mark ?? 100,
});

const normalizeClass = (row = {}) => ({
  classId: row.classId ?? row.class_id,
  className: row.className ?? row.class_name ?? "-",
  grade: row.grade ?? "-",
  academicYear: row.term?.academicYear ?? row.term?.academic_year ?? "-",
  semester: row.term?.semester ?? "-",
});

const normalizeStudent = (row = {}) => ({
  studentId: row.studentId ?? row.student_id,
  studentSchoolId: row.studentSchoolId ?? row.student_school_id ?? "-",
  fullName: row.fullName ?? row.full_name ?? "-",
  gender: row.gender ?? "-",
});

const normalizeAcademicRow = (row = {}) => ({
  studentSchoolId: row.studentSchoolId ?? row.student_school_id ?? "-",
  fullName: row.fullName ?? row.full_name ?? "-",
  className: row.className ?? row.class_name ?? "-",
  averageScore: Number(row.averageScore ?? row.average_score ?? 0),
  rank: row.rank ?? null,
  status: row.status ?? "INCOMPLETE",
});

const DepartmentDashboard = () => {
  const { user } = useAuth();
  const departmentId =
    user?.departmentId ??
    user?.department_id ??
    user?.teacher?.departmentId ??
    user?.teacher?.department_id ??
    null;
  const userRoles = user?.roles || [];

  const canDeleteTeacher = userRoles.includes("SYSTEM_ADMIN");
  const canDeleteSubject = userRoles.includes("SYSTEM_ADMIN");
  const canDeleteStudent = userRoles.includes("SYSTEM_ADMIN");

  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);

  const [assignSubjectModalOpen, setAssignSubjectModalOpen] = useState(false);
  const [assignClassSubjectModalOpen, setAssignClassSubjectModalOpen] =
    useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [classSubjectOptions, setClassSubjectOptions] = useState([]);
  const [loadingClassSubjects, setLoadingClassSubjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const teachersQuery = useFetch(
    () =>
      departmentId
        ? teacherApi.getByDepartment(departmentId)
        : teacherApi.getAll(),
    [departmentId],
  );

  const subjectsQuery = useFetch(
    () =>
      departmentId
        ? subjectApi.getByDepartment(departmentId)
        : subjectApi.getAll(),
    [departmentId],
  );

  const studentsQuery = useFetch(() => studentApi.getAll(), []);
  const classesQuery = useFetch(() => classApi.getAll(), []);
  const reportQuery = useFetch(() => reportApi.getAcademicReport(), []);

  const departmentQuery = useFetch(
    () =>
      departmentId
        ? departmentApi.getById(departmentId)
        : Promise.resolve(null),
    [departmentId],
    true,
    { mode: "payload", initialData: null },
  );

  const teacherRows = useMemo(
    () => (teachersQuery.data || []).map((row) => normalizeTeacher(row)),
    [teachersQuery.data],
  );

  const subjectRows = useMemo(
    () => (subjectsQuery.data || []).map((row) => normalizeSubject(row)),
    [subjectsQuery.data],
  );

  const studentRows = useMemo(
    () => (studentsQuery.data || []).map((row) => normalizeStudent(row)),
    [studentsQuery.data],
  );

  const classRows = useMemo(
    () => (classesQuery.data || []).map((row) => normalizeClass(row)),
    [classesQuery.data],
  );

  const reportRows = useMemo(
    () => (reportQuery.data || []).map((row) => normalizeAcademicRow(row)),
    [reportQuery.data],
  );

  const passRows = reportRows.filter((row) => row.status === "PASS");
  const failRows = reportRows.filter((row) => row.status !== "PASS");

  const passRate = reportRows.length
    ? ((passRows.length / reportRows.length) * 100).toFixed(1)
    : "0.0";

  const needsSupportRows = useMemo(
    () =>
      [...failRows]
        .sort(
          (a, b) => Number(a.averageScore || 0) - Number(b.averageScore || 0),
        )
        .slice(0, 12),
    [failRows],
  );

  const topPerformers = useMemo(() => {
    const ranked = [...reportRows].filter((row) => row.rank !== null);
    return ranked.sort((a, b) => Number(a.rank) - Number(b.rank)).slice(0, 12);
  }, [reportRows]);

  const errors = [
    teachersQuery.error,
    subjectsQuery.error,
    studentsQuery.error,
    classesQuery.error,
    reportQuery.error,
    departmentQuery.error,
  ].filter(Boolean);

  const classOptions = classRows.map((row) => ({
    value: String(row.classId),
    label: `${row.grade} - ${row.className} (${row.academicYear} Term ${row.semester})`,
  }));

  const subjectOptions = subjectRows.map((row) => ({
    value: String(row.subjectId),
    label: `${row.name} (${row.code})`,
  }));

  const teacherOptions = teacherRows.map((row) => ({
    value: String(row.teacherId),
    label: row.fullName,
  }));

  const refreshAll = async () => {
    await Promise.allSettled([
      teachersQuery.refetch(),
      subjectsQuery.refetch(),
      studentsQuery.refetch(),
      classesQuery.refetch(),
      reportQuery.refetch(),
      departmentQuery.refetch(),
    ]);
  };

  const subjectForm = useForm({
    initialValues: { name: "", code: "", totalMark: "100" },
    validate: (values) => {
      const formErrors = {};
      if (!values.name?.trim()) formErrors.name = "Name is required";
      if (!values.code?.trim()) formErrors.code = "Code is required";

      const total = asInt(values.totalMark);
      if (!total || total < 1 || total > 100) {
        formErrors.totalMark = "Total mark must be 1 to 100";
      }

      return formErrors;
    },
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const resolvedDepartmentId = asInt(departmentId);
        const payload = {
          name: values.name.trim(),
          code: values.code.trim(),
          totalMark: Number(values.totalMark),
          ...(resolvedDepartmentId
            ? { departmentId: resolvedDepartmentId }
            : {}),
        };

        if (editingSubject) {
          await subjectApi.update(editingSubject.subjectId, payload);
          notify({ type: "success", message: "Subject updated successfully" });
        } else {
          await subjectApi.create(payload);
          notify({ type: "success", message: "Subject created successfully" });
        }

        setSubjectModalOpen(false);
        setEditingSubject(null);
        subjectForm.reset();
        await subjectsQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: extractErrorMessage(error, "Failed to save subject"),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const teacherForm = useForm({
    initialValues: {
      fullName: "",
      email: "",
      password: "",
      departmentId: departmentId ? String(departmentId) : "",
    },
    validate: (values) => {
      const formErrors = {};

      if (!values.fullName?.trim())
        formErrors.fullName = "Full name is required";
      if (!values.departmentId)
        formErrors.departmentId = "Department is required";

      if (!editingTeacher) {
        if (!values.email?.trim()) formErrors.email = "Email is required";
        if (!values.password?.trim())
          formErrors.password = "Password is required";
      }

      return formErrors;
    },
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        if (editingTeacher) {
          await teacherApi.update(editingTeacher.teacherId, {
            fullName: values.fullName.trim(),
            departmentId: values.departmentId
              ? Number(values.departmentId)
              : null,
          });
          notify({ type: "success", message: "Teacher updated successfully" });
        } else {
          const payload = {
            fullName: values.fullName.trim(),
            departmentId: values.departmentId
              ? Number(values.departmentId)
              : null,
            roleName: "TEACHER",
            email: values.email.trim(),
            password: values.password,
          };

          await teacherApi.create(payload);
          notify({ type: "success", message: "Teacher created successfully" });
        }

        setTeacherModalOpen(false);
        setEditingTeacher(null);
        teacherForm.reset();
        await teachersQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: extractErrorMessage(error, "Failed to save teacher"),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const studentForm = useForm({
    initialValues: { fullName: "", gender: "" },
    validate: (values) => {
      const formErrors = {};
      if (!values.fullName?.trim())
        formErrors.fullName = "Full name is required";
      if (!["M", "F"].includes(values.gender)) {
        formErrors.gender = "Gender is required";
      }
      return formErrors;
    },
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const payload = {
          fullName: values.fullName.trim(),
          gender: values.gender,
        };

        if (editingStudent) {
          await studentApi.update(editingStudent.studentId, payload);
          notify({ type: "success", message: "Student updated successfully" });
        } else {
          await studentApi.create(payload);
          notify({ type: "success", message: "Student created successfully" });
        }

        setStudentModalOpen(false);
        setEditingStudent(null);
        studentForm.reset();
        await studentsQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: extractErrorMessage(error, "Failed to save student"),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const departmentForm = useForm({
    initialValues: { name: "", code: "" },
    validate: (values) => {
      const formErrors = {};
      if (!values.name?.trim()) formErrors.name = "Department name is required";
      if (!values.code?.trim()) formErrors.code = "Department code is required";
      return formErrors;
    },
    onSubmit: async (values) => {
      if (!departmentId) {
        notify({ type: "error", message: "Department context is missing" });
        return;
      }

      setSubmitting(true);
      try {
        await departmentApi.update(departmentId, {
          name: values.name.trim(),
          code: values.code.trim(),
        });

        notify({ type: "success", message: "Department updated successfully" });
        setDepartmentModalOpen(false);
        await departmentQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: extractErrorMessage(error, "Failed to update department"),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const assignSubjectForm = useForm({
    initialValues: { classId: "", classSubjectId: "" },
    validate: (values) => {
      const formErrors = {};
      if (!values.classId) formErrors.classId = "Class is required";
      if (!values.classSubjectId) {
        formErrors.classSubjectId = "Class-subject is required";
      }
      return formErrors;
    },
    onSubmit: async (values) => {
      if (!selectedTeacher?.teacherId) return;

      setSubmitting(true);
      try {
        await teacherApi.assignToSubject({
          teacherId: Number(selectedTeacher.teacherId),
          classSubjectId: Number(values.classSubjectId),
        });

        notify({ type: "success", message: "Teacher assigned successfully" });
        setAssignSubjectModalOpen(false);
        setSelectedTeacher(null);
        setClassSubjectOptions([]);
        assignSubjectForm.reset();
        await teachersQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: extractErrorMessage(error, "Failed to assign teacher"),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const assignClassSubjectForm = useForm({
    initialValues: { teacherId: "", classId: "", subjectId: "" },
    validate: (values) => {
      const formErrors = {};
      if (!values.teacherId) formErrors.teacherId = "Teacher is required";
      if (!values.classId) formErrors.classId = "Class is required";
      if (!values.subjectId) formErrors.subjectId = "Subject is required";
      return formErrors;
    },
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const classId = Number(values.classId);
        const subjectId = Number(values.subjectId);
        const teacherId = Number(values.teacherId);

        const classSubjectsResponse = await classApi.getSubjects(classId);
        const classSubjectsPayload = extractPayload(classSubjectsResponse);
        const classSubjects = Array.isArray(classSubjectsPayload)
          ? classSubjectsPayload
          : [];

        let mappedClassSubject = classSubjects.find((row) => {
          const existingSubjectId =
            row.subjectId ??
            row.subject_id ??
            row.subject?.subjectId ??
            row.subject?.subject_id;
          return Number(existingSubjectId) === subjectId;
        });

        if (!mappedClassSubject) {
          const addSubjectResponse = await classApi.addSubject(classId, {
            subjectId,
          });
          mappedClassSubject = extractPayload(addSubjectResponse);
        }

        const classSubjectId =
          mappedClassSubject?.classSubjectId ??
          mappedClassSubject?.class_subject_id;

        if (!classSubjectId) {
          throw new Error("Could not resolve class-subject mapping");
        }

        await teacherApi.assignToSubject({ teacherId, classSubjectId });

        notify({
          type: "success",
          message: "Teacher assigned to class successfully",
        });

        setAssignClassSubjectModalOpen(false);
        assignClassSubjectForm.reset();
        await teachersQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: extractErrorMessage(
            error,
            "Failed to assign teacher to class",
          ),
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const loadClassSubjectOptions = useCallback(async (classId) => {
    if (!classId) {
      setClassSubjectOptions([]);
      return;
    }

    setLoadingClassSubjects(true);
    try {
      const response = await classApi.getSubjects(classId);
      const payload = extractPayload(response);
      const rows = Array.isArray(payload) ? payload : [];

      const nextOptions = rows
        .map((row) => {
          const classSubjectId = row.classSubjectId ?? row.class_subject_id;
          const subjectName =
            row.subject?.name ?? row.subject_name ?? "Subject";
          const subjectCode = row.subject?.code ?? row.subject_code ?? "-";

          if (!classSubjectId) return null;
          return {
            value: String(classSubjectId),
            label: `${subjectName} (${subjectCode})`,
          };
        })
        .filter(Boolean);

      setClassSubjectOptions(nextOptions);
    } catch (error) {
      setClassSubjectOptions([]);
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to load class subjects"),
      });
    } finally {
      setLoadingClassSubjects(false);
    }
  }, []);

  useEffect(() => {
    if (!departmentModalOpen) return;
    departmentForm.setValues({
      name: departmentQuery.data?.name || "",
      code: departmentQuery.data?.code || "",
    });
  }, [departmentModalOpen, departmentQuery.data]);

  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    subjectForm.setValues({
      name: subject.name,
      code: subject.code,
      totalMark: String(subject.totalMark || 100),
    });
    setSubjectModalOpen(true);
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!canDeleteSubject) return;
    if (!window.confirm("Delete this subject?")) return;
    try {
      await subjectApi.remove(subjectId);
      notify({ type: "success", message: "Subject deleted" });
      await subjectsQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete subject"),
      });
    }
  };

  const handleEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    teacherForm.setValues({
      fullName: teacher.fullName,
      email: "",
      password: "",
      departmentId: teacher.departmentId ? String(teacher.departmentId) : "",
    });
    setTeacherModalOpen(true);
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!canDeleteTeacher) return;
    if (!window.confirm("Delete this teacher?")) return;
    try {
      await teacherApi.remove(teacherId);
      notify({ type: "success", message: "Teacher deleted" });
      await teachersQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete teacher"),
      });
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    studentForm.setValues({
      fullName: student.fullName,
      gender: student.gender,
    });
    setStudentModalOpen(true);
  };

  const handleDeleteStudent = async (studentId) => {
    if (!canDeleteStudent) return;
    if (!window.confirm("Delete this student?")) return;
    try {
      await studentApi.remove(studentId);
      notify({ type: "success", message: "Student deleted" });
      await studentsQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete student"),
      });
    }
  };

  const handleOpenAssignSubject = (teacher) => {
    setSelectedTeacher(teacher);
    setClassSubjectOptions([]);
    assignSubjectForm.reset();
    setAssignSubjectModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {errors.length ? (
        <StateView
          type="error"
          title="Department data load issue"
          description={errors[0]}
          action={
            <button
              type="button"
              onClick={refreshAll}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Retry Dashboard Load
            </button>
          }
        />
      ) : null}

      {departmentQuery.data ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {departmentQuery.data.name}
                <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {departmentQuery.data.code}
                </span>
              </p>
              <p className="text-xs text-emerald-600">Your department</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDepartmentModalOpen(true)}
            >
              Edit Department
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="metric-item">
          <p className="metric-label">Teachers</p>
          <p className="metric-value">{teacherRows.length}</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Subjects</p>
          <p className="metric-value">{subjectRows.length}</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Students</p>
          <p className="metric-value">{studentRows.length}</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Pass Rate</p>
          <p className="metric-value">{passRate}%</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Needs Support</p>
          <p className="metric-value">{failRows.length}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Link to="/students" className="card">
          <p className="text-sm font-semibold">Open Students</p>
          <p className="text-xs text-slate-500">
            Assign students and manage profiles.
          </p>
        </Link>
        <Link to="/teachers" className="card">
          <p className="text-sm font-semibold">Open Teachers</p>
          <p className="text-xs text-slate-500">
            Manage teacher accounts and assignments.
          </p>
        </Link>
        <Link to="/reports" className="card">
          <p className="text-sm font-semibold">Open Reports</p>
          <p className="text-xs text-slate-500">
            Monitor rankings and pass/fail status.
          </p>
        </Link>
      </div>

      <TableSection
        title="Subject Management"
        actions={
          <Button
            type="button"
            onClick={() => {
              setEditingSubject(null);
              subjectForm.reset();
              setSubjectModalOpen(true);
            }}
          >
            Add Subject
          </Button>
        }
      >
        <Table
          rows={subjectRows}
          loading={subjectsQuery.loading}
          error={subjectsQuery.error}
          columns={[
            { key: "subjectId", title: "ID" },
            { key: "name", title: "Name" },
            { key: "code", title: "Code" },
            { key: "totalMark", title: "Total Mark" },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSubject(row)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Edit
                  </button>
                  {canDeleteSubject ? (
                    <button
                      onClick={() => handleDeleteSubject(row.subjectId)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
          searchPlaceholder="Search subjects..."
        />
      </TableSection>

      <TableSection
        title="Teacher Management"
        actions={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                assignClassSubjectForm.reset();
                setAssignClassSubjectModalOpen(true);
              }}
            >
              Assign Teacher to Class
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditingTeacher(null);
                teacherForm.reset();
                setTeacherModalOpen(true);
              }}
            >
              Add Teacher
            </Button>
          </div>
        }
      >
        <Table
          rows={teacherRows}
          loading={teachersQuery.loading}
          error={teachersQuery.error}
          columns={[
            { key: "teacherId", title: "ID" },
            { key: "fullName", title: "Name" },
            { key: "userEmail", title: "User" },
            { key: "departmentName", title: "Department" },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditTeacher(row)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleOpenAssignSubject(row)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Assign Subject
                  </button>
                  {canDeleteTeacher ? (
                    <button
                      onClick={() => handleDeleteTeacher(row.teacherId)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
          searchPlaceholder="Search teachers..."
        />
      </TableSection>

      <TableSection
        title="Student Management"
        actions={
          <Button
            type="button"
            onClick={() => {
              setEditingStudent(null);
              studentForm.reset();
              setStudentModalOpen(true);
            }}
          >
            Add Student
          </Button>
        }
      >
        <Table
          rows={studentRows}
          loading={studentsQuery.loading}
          error={studentsQuery.error}
          columns={[
            { key: "studentId", title: "ID" },
            { key: "studentSchoolId", title: "School ID" },
            { key: "fullName", title: "Name" },
            { key: "gender", title: "Gender" },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditStudent(row)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Edit
                  </button>
                  {canDeleteStudent ? (
                    <button
                      onClick={() => handleDeleteStudent(row.studentId)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
          searchPlaceholder="Search students..."
        />
      </TableSection>

      <TableSection title="Students Requiring Academic Support">
        <Table
          rows={needsSupportRows}
          loading={reportQuery.loading && !needsSupportRows.length}
          error={reportQuery.error}
          columns={[
            { key: "studentSchoolId", title: "Student ID" },
            { key: "fullName", title: "Student" },
            { key: "className", title: "Class" },
            { key: "averageScore", title: "Average" },
            { key: "status", title: "Status" },
          ]}
          searchPlaceholder="Search support list..."
        />
      </TableSection>

      <TableSection title="Top Performing Students (Competition Ranking)">
        <Table
          rows={topPerformers}
          loading={reportQuery.loading && !topPerformers.length}
          error={reportQuery.error}
          columns={[
            { key: "rank", title: "Rank" },
            { key: "studentSchoolId", title: "Student ID" },
            { key: "fullName", title: "Student" },
            { key: "className", title: "Class" },
            { key: "averageScore", title: "Average" },
          ]}
          searchPlaceholder="Search top performers..."
        />
      </TableSection>

      <Modal
        open={subjectModalOpen}
        title={editingSubject ? "Edit Subject" : "Add Subject"}
        onClose={() => {
          setSubjectModalOpen(false);
          setEditingSubject(null);
          subjectForm.reset();
        }}
      >
        <form onSubmit={subjectForm.handleSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            value={subjectForm.values.name}
            onChange={subjectForm.handleChange}
            error={subjectForm.errors.name}
            required
          />
          <Input
            label="Code"
            name="code"
            value={subjectForm.values.code}
            onChange={subjectForm.handleChange}
            error={subjectForm.errors.code}
            required
          />
          <Input
            label="Total Mark"
            name="totalMark"
            type="number"
            min="1"
            max="100"
            step="1"
            value={subjectForm.values.totalMark}
            onChange={subjectForm.handleChange}
            error={subjectForm.errors.totalMark}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSubjectModalOpen(false);
                setEditingSubject(null);
                subjectForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingSubject ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={teacherModalOpen}
        title={editingTeacher ? "Edit Teacher" : "Add Teacher"}
        onClose={() => {
          setTeacherModalOpen(false);
          setEditingTeacher(null);
          teacherForm.reset();
        }}
      >
        <form onSubmit={teacherForm.handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="fullName"
            value={teacherForm.values.fullName}
            onChange={teacherForm.handleChange}
            error={teacherForm.errors.fullName}
            required
          />
          {!editingTeacher ? (
            <>
              <Input
                label="Email"
                name="email"
                type="email"
                value={teacherForm.values.email}
                onChange={teacherForm.handleChange}
                error={teacherForm.errors.email}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={teacherForm.values.password}
                onChange={teacherForm.handleChange}
                error={teacherForm.errors.password}
              />
            </>
          ) : null}

          <Select
            label="Department"
            name="departmentId"
            value={teacherForm.values.departmentId}
            onChange={teacherForm.handleChange}
            options={
              departmentQuery.data
                ? [
                    {
                      value: String(
                        departmentQuery.data.departmentId ?? departmentId,
                      ),
                      label: `${departmentQuery.data.name} (${departmentQuery.data.code})`,
                    },
                  ]
                : []
            }
            error={teacherForm.errors.departmentId}
            required
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setTeacherModalOpen(false);
                setEditingTeacher(null);
                teacherForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingTeacher ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={studentModalOpen}
        title={editingStudent ? "Edit Student" : "Add Student"}
        onClose={() => {
          setStudentModalOpen(false);
          setEditingStudent(null);
          studentForm.reset();
        }}
      >
        <form onSubmit={studentForm.handleSubmit} className="space-y-4">
          {!editingStudent ? (
            <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              School ID is generated automatically by the system when the
              student is created.
            </p>
          ) : null}
          <Input
            label="Full Name"
            name="fullName"
            value={studentForm.values.fullName}
            onChange={studentForm.handleChange}
            error={studentForm.errors.fullName}
            required
          />
          <Select
            label="Gender"
            name="gender"
            value={studentForm.values.gender}
            onChange={studentForm.handleChange}
            options={[
              { value: "M", label: "Male" },
              { value: "F", label: "Female" },
            ]}
            error={studentForm.errors.gender}
            required
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStudentModalOpen(false);
                setEditingStudent(null);
                studentForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingStudent ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={departmentModalOpen}
        title="Edit Department"
        onClose={() => setDepartmentModalOpen(false)}
      >
        <form onSubmit={departmentForm.handleSubmit} className="space-y-4">
          <Input
            label="Department Name"
            name="name"
            value={departmentForm.values.name}
            onChange={departmentForm.handleChange}
            error={departmentForm.errors.name}
            required
          />
          <Input
            label="Department Code"
            name="code"
            value={departmentForm.values.code}
            onChange={departmentForm.handleChange}
            error={departmentForm.errors.code}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDepartmentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignSubjectModalOpen}
        title={`Assign ${selectedTeacher?.fullName || "Teacher"} to Class Subject`}
        onClose={() => {
          setAssignSubjectModalOpen(false);
          setSelectedTeacher(null);
          setClassSubjectOptions([]);
          assignSubjectForm.reset();
        }}
      >
        <form onSubmit={assignSubjectForm.handleSubmit} className="space-y-4">
          <Select
            label="Class"
            name="classId"
            value={assignSubjectForm.values.classId}
            onChange={async (event) => {
              const classId = event.target.value;
              assignSubjectForm.setValues((prev) => ({
                ...prev,
                classId,
                classSubjectId: "",
              }));
              await loadClassSubjectOptions(classId);
            }}
            options={classOptions}
            error={assignSubjectForm.errors.classId}
            required
          />
          <Select
            label="Class Subject"
            name="classSubjectId"
            value={assignSubjectForm.values.classSubjectId}
            onChange={assignSubjectForm.handleChange}
            options={classSubjectOptions}
            error={assignSubjectForm.errors.classSubjectId}
            disabled={!assignSubjectForm.values.classId || loadingClassSubjects}
            required
          />
          <p className="text-xs text-slate-500">
            Choose class first. The list loads mapped class-subject
            combinations.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAssignSubjectModalOpen(false);
                setSelectedTeacher(null);
                setClassSubjectOptions([]);
                assignSubjectForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Assign
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignClassSubjectModalOpen}
        title="Assign Teacher to Class"
        onClose={() => {
          setAssignClassSubjectModalOpen(false);
          assignClassSubjectForm.reset();
        }}
      >
        <form
          onSubmit={assignClassSubjectForm.handleSubmit}
          className="space-y-4"
        >
          <Select
            label="Teacher"
            name="teacherId"
            value={assignClassSubjectForm.values.teacherId}
            onChange={assignClassSubjectForm.handleChange}
            options={teacherOptions}
            error={assignClassSubjectForm.errors.teacherId}
            required
          />
          <Select
            label="Class"
            name="classId"
            value={assignClassSubjectForm.values.classId}
            onChange={assignClassSubjectForm.handleChange}
            options={classOptions}
            error={assignClassSubjectForm.errors.classId}
            required
          />
          <Select
            label="Subject"
            name="subjectId"
            value={assignClassSubjectForm.values.subjectId}
            onChange={assignClassSubjectForm.handleChange}
            options={subjectOptions}
            error={assignClassSubjectForm.errors.subjectId}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAssignClassSubjectModalOpen(false);
                assignClassSubjectForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Assign
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentDashboard;
