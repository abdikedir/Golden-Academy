import { useMemo, useState } from "react";
import studentApi from "../api/studentApi";
import classApi from "../api/classApi";
import PageLayout from "../components/layout/PageLayout";
import StudentForm from "../components/students/StudentForm";
import EnrollmentForm from "../components/students/EnrollmentForm";
import StudentList from "../components/students/StudentList";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import TableSection from "../components/common/TableSection";
import { FileDown } from "lucide-react";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../api/responseAdapter";
import { exportRowsToPdf } from "../utils/exportPdf";
import { notify } from "../utils/notifications";

const StudentsPage = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [activeStudentActionId, setActiveStudentActionId] = useState(null);

  const studentsQuery = useFetch(() => studentApi.getAll(), []);
  const classesQuery = useFetch(() => classApi.getAll(), []);
  const enrollmentsQuery = useFetch(
    () => studentApi.getAllEnrollments({ page: 1, limit: 500 }),
    [],
    true,
    { mode: "payload", initialData: { enrollments: [] } },
  );

  const latestEnrollmentByStudent = useMemo(() => {
    const map = new Map();
    const enrollments = enrollmentsQuery.data?.enrollments || [];

    enrollments.forEach((enrollment) => {
      const studentId =
        enrollment.studentId ||
        enrollment.student_id ||
        enrollment.student?.studentId ||
        enrollment.student?.student_id;

      if (!studentId || map.has(String(studentId))) return;
      map.set(String(studentId), enrollment);
    });

    return map;
  }, [enrollmentsQuery.data]);

  const studentsWithAssignment = useMemo(
    () =>
      (studentsQuery.data || []).map((student) => {
        const studentId = student.studentId || student.student_id;
        const enrollment = latestEnrollmentByStudent.get(String(studentId));
        const classData = enrollment?.class || {};
        const termData = classData.term || {};

        const section =
          classData.className ||
          classData.class_name ||
          student.class_name ||
          "-";
        const classLevel = classData.grade || student.grade || "-";
        const academicYear =
          termData.academicYear || termData.academic_year || "-";
        const semester = termData.semester || "-";

        return {
          ...student,
          studentId,
          studentSchoolId:
            student.studentSchoolId || student.student_school_id || "-",
          fullName: student.fullName || student.full_name || "-",
          classDisplay:
            classLevel === "-" && section === "-"
              ? "-"
              : `${classLevel} - ${section}`,
          academicYear,
          semester,
          section,
        };
      }),
    [latestEnrollmentByStudent, studentsQuery.data],
  );

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role).toUpperCase())
    : [];

  const canCreateOrUpdate = normalizedRoles.some((role) =>
    ["SYSTEM_ADMIN", "REGISTRAR", "DEPARTMENT_ADMIN"].includes(role),
  );

  const canDelete = normalizedRoles.some((role) =>
    ["SYSTEM_ADMIN", "REGISTRAR"].includes(role),
  );

  const normalizeStudent = (student) => ({
    studentId: student.studentId || student.student_id,
    studentSchoolId: student.studentSchoolId || student.student_school_id,
    fullName: student.fullName || student.full_name || "",
    gender: student.gender || "",
  });

  const handleCreateStudent = async (values) => {
    setSaving(true);
    try {
      await studentApi.create({
        fullName: values.fullName,
        gender: values.gender,
      });
      notify({ type: "success", message: "Student created" });
      await studentsQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to create student"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditStudent = (student) => {
    setEditingStudent(normalizeStudent(student));
  };

  const handleUpdateStudent = async (values) => {
    if (!editingStudent?.studentId) return;

    setSaving(true);
    setActiveStudentActionId(editingStudent.studentId);

    try {
      await studentApi.update(editingStudent.studentId, {
        fullName: values.fullName,
        gender: values.gender,
      });
      notify({ type: "success", message: "Student updated" });
      setEditingStudent(null);
      await studentsQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to update student"),
      });
    } finally {
      setSaving(false);
      setActiveStudentActionId(null);
    }
  };

  const handleDeleteStudent = async (student) => {
    const normalizedStudent = normalizeStudent(student);
    if (!normalizedStudent.studentId) return;

    const confirmed = window.confirm(
      `Delete student ${normalizedStudent.fullName} (${normalizedStudent.studentSchoolId})?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setActiveStudentActionId(normalizedStudent.studentId);

    try {
      await studentApi.remove(normalizedStudent.studentId);
      notify({ type: "success", message: "Student deleted" });

      if (
        editingStudent?.studentId &&
        String(editingStudent.studentId) === String(normalizedStudent.studentId)
      ) {
        setEditingStudent(null);
      }

      await Promise.all([studentsQuery.refetch(), enrollmentsQuery.refetch()]);
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete student"),
      });
    } finally {
      setSaving(false);
      setActiveStudentActionId(null);
    }
  };

  const handleEnroll = async (values) => {
    setSaving(true);
    try {
      await studentApi.enroll({
        studentId: Number(values.studentId),
        classId: Number(values.classId),
      });
      notify({ type: "success", message: "Student enrolled" });
      await enrollmentsQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Enrollment failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportStudents = async () => {
    if (!studentsWithAssignment.length) {
      notify({
        type: "warning",
        message: "No student data is available for export.",
      });
      return;
    }

    await exportRowsToPdf({
      fileName: "golden-high-school-students.pdf",
      title: "Golden High School - Student Directory",
      subtitle: `Total records: ${studentsWithAssignment.length}`,
      columns: [
        { header: "Student ID", accessor: (row) => row.studentSchoolId },
        { header: "Full Name", accessor: (row) => row.fullName },
        { header: "Gender", accessor: (row) => row.gender },
        { header: "Class", accessor: (row) => row.classDisplay || "-" },
        {
          header: "Academic Year",
          accessor: (row) => row.academicYear || "-",
        },
        { header: "Section", accessor: (row) => row.section || "-" },
      ],
      rows: studentsWithAssignment,
    });

    notify({
      type: "success",
      message: "Student data has been exported successfully.",
    });
  };

  return (
    <PageLayout title="Students">
      {canCreateOrUpdate ? (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Register Student
          </h3>
          <StudentForm
            initialValues={{ fullName: "", gender: "" }}
            onSubmit={handleCreateStudent}
            loading={saving}
          />
        </div>
      ) : null}

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Enroll Student to Class
        </h3>
        <EnrollmentForm
          students={studentsQuery.data}
          classes={classesQuery.data}
          onSubmit={handleEnroll}
          loading={saving}
        />
      </div>

      <TableSection
        title="Student List"
        actions={
          <Button variant="secondary" onClick={handleExportStudents}>
            <span className="inline-flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Export PDF
            </span>
          </Button>
        }
      >
        <StudentList
          students={studentsWithAssignment}
          loading={studentsQuery.loading || enrollmentsQuery.loading}
          error={studentsQuery.error || enrollmentsQuery.error}
          onEdit={canCreateOrUpdate ? handleStartEditStudent : undefined}
          onDelete={canDelete ? handleDeleteStudent : undefined}
          actionLoading={saving}
          activeStudentId={activeStudentActionId}
        />
      </TableSection>

      <Modal
        open={Boolean(editingStudent)}
        title="Update Student"
        onClose={() => {
          if (!saving) setEditingStudent(null);
        }}
      >
        <p className="mb-3 text-xs font-medium text-slate-500">
          School ID: {editingStudent?.studentSchoolId || "-"}
        </p>
        <StudentForm
          key={editingStudent?.studentId || "student-edit-form"}
          initialValues={{
            fullName: editingStudent?.fullName || "",
            gender: editingStudent?.gender || "",
          }}
          onSubmit={handleUpdateStudent}
          loading={saving}
        />
      </Modal>
    </PageLayout>
  );
};

export default StudentsPage;
