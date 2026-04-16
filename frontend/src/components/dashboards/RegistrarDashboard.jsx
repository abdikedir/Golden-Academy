import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import studentApi from "../../api/studentApi";
import classApi from "../../api/classApi";
import termApi from "../../api/termApi";
import Table from "../common/Table";
import TableSection from "../common/TableSection";
import StateView from "../common/StateView";
import Button from "../common/Button";
import Modal from "../common/Modal";
import StudentForm from "../students/StudentForm";
import EnrollmentForm from "../students/EnrollmentForm";
import StudentSearch from "../students/StudentSearch";
import EnrollmentHistory from "../students/EnrollmentHistory";
import PromotionForm from "../students/PromotionForm";
import { useFetch } from "../../hooks/useFetch";
import { formatDate } from "../../utils/formatDate";
import { notify } from "../../utils/notifications";
import { extractErrorMessage, extractPayload } from "../../api/responseAdapter";
import {
  UserPlus,
  Users,
  BookOpen,
  TrendingUp,
  History,
  Search,
} from "lucide-react";

const RegistrarDashboard = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const studentsQuery = useFetch(() => studentApi.getAll(), []);
  const classesQuery = useFetch(() => classApi.getAll(), []);
  const termsQuery = useFetch(() => termApi.getAll(), []);
  const enrollmentsQuery = useFetch(
    () => studentApi.getAllEnrollments(),
    [],
    true,
    {
      mode: "payload",
      initialData: { enrollments: [], total: 0, page: 1, totalPages: 1 },
    },
  );
  const historyQuery = useFetch(
    () =>
      selectedStudentId
        ? studentApi.getHistory(selectedStudentId)
        : Promise.resolve(null),
    [selectedStudentId],
    true,
    { mode: "payload", initialData: null },
  );

  const errors = [
    studentsQuery.error,
    classesQuery.error,
    termsQuery.error,
    enrollmentsQuery.error,
  ].filter(Boolean);

  const classLookup = useMemo(
    () =>
      Object.fromEntries(
        (classesQuery.data || []).map((classRow) => [
          classRow.class_id,
          `${classRow.class_name} (${classRow.grade})`,
        ]),
      ),
    [classesQuery.data],
  );

  const studentLookup = useMemo(
    () =>
      Object.fromEntries(
        (studentsQuery.data || []).map((student) => [
          student.student_id,
          student.full_name,
        ]),
      ),
    [studentsQuery.data],
  );

  // Calculate enrollment statistics
  const enrollmentStats = useMemo(() => {
    const enrollments = enrollmentsQuery.data?.enrollments || [];
    const currentTerm = termsQuery.data?.[0]; // Assuming first term is current

    const currentTermEnrollments = currentTerm
      ? enrollments.filter((e) => e.class?.termId === currentTerm.term_id)
      : [];

    return {
      total: enrollments.length,
      currentTerm: currentTermEnrollments.length,
      pendingTasks: 0, // Can be calculated based on incomplete enrollments
    };
  }, [enrollmentsQuery.data, termsQuery.data]);

  const recentEnrollments = useMemo(() => {
    const enrollments = enrollmentsQuery.data?.enrollments || [];
    return [...enrollments]
      .sort(
        (a, b) =>
          new Date(b.enrolledAt || 0).getTime() -
          new Date(a.enrolledAt || 0).getTime(),
      )
      .slice(0, 10)
      .map((row) => ({
        ...row,
        student_label:
          row.student?.fullName ||
          studentLookup[row.studentId] ||
          row.studentId,
        class_label: row.class
          ? `${row.class.className} (${row.class.grade})`
          : classLookup[row.classId] || row.classId,
        enrolled_on: formatDate(row.enrolledAt),
      }));
  }, [enrollmentsQuery.data, studentLookup, classLookup]);

  const loading =
    studentsQuery.loading ||
    classesQuery.loading ||
    termsQuery.loading ||
    enrollmentsQuery.loading;

  const refreshAll = async () => {
    await Promise.allSettled([
      studentsQuery.refetch(),
      classesQuery.refetch(),
      termsQuery.refetch(),
      enrollmentsQuery.refetch(),
    ]);
  };

  // Handler functions
  const handleCreateStudent = async (values) => {
    setSaving(true);
    try {
      const response = await studentApi.create({
        fullName: values.fullName,
        gender: values.gender,
      });
      const created = extractPayload(response);
      notify({
        type: "success",
        message: `Student registered successfully. Assigned School ID: ${created?.studentSchoolId || "N/A"}`,
      });
      await studentsQuery.refetch();
      setActiveModal(null);
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Student registration failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnroll = async (values) => {
    setSaving(true);
    try {
      await studentApi.enroll({
        studentId: Number(values.studentId),
        classId: Number(values.classId),
      });
      notify({ type: "success", message: "Student enrolled successfully" });
      await enrollmentsQuery.refetch();
      setActiveModal(null);
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Enrollment failed"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await studentApi.search(searchTerm);
      const payload = extractPayload(response) || {};
      setSearchResults(payload.students || []);
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Student search failed"),
      });
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePromote = async (values) => {
    setSaving(true);
    try {
      const response = await studentApi.promote({
        currentClassId: Number(values.currentClassId),
        nextClassId: Number(values.nextClassId),
        nextTermId: Number(values.nextTermId),
      });

      const payload = extractPayload(response) || {};
      const promotedCount = payload.promotedCount || 0;
      const currentLabel = payload.currentClass
        ? `${payload.currentClass.className} (${payload.currentClass.term?.academicYear} Term ${payload.currentClass.term?.semester})`
        : "selected current class";
      const nextLabel = payload.nextClass
        ? `${payload.nextClass.className} (${payload.nextClass.term?.academicYear} Term ${payload.nextClass.term?.semester})`
        : "selected next class";

      notify({
        type: "success",
        message: `Promotion completed: ${promotedCount} student(s) moved from ${currentLabel} to ${nextLabel}.`,
      });

      await enrollmentsQuery.refetch();
      setActiveModal(null);
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(
          error,
          "Promotion failed. Verify class progression and results publication status.",
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleViewHistory = (studentId) => {
    setSelectedStudentId(studentId);
    setActiveModal("history");
  };

  return (
    <div className="space-y-4">
      {errors.length ? (
        <StateView
          type="error"
          title="Some operational data failed to load"
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

      {/* Statistics Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="metric-item">
          <p className="metric-label">Total Students</p>
          <p className="metric-value">{studentsQuery.data?.length || 0}</p>
          <p className="mt-1 text-xs text-slate-600">Registered learners</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Total Enrollments</p>
          <p className="metric-value">{enrollmentStats.total}</p>
          <p className="mt-1 text-xs text-slate-600">All-time placements</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Current Term</p>
          <p className="metric-value">{enrollmentStats.currentTerm}</p>
          <p className="mt-1 text-xs text-slate-600">Active enrollments</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Pending Tasks</p>
          <p className="metric-value">{enrollmentStats.pendingTasks}</p>
          <p className="mt-1 text-xs text-slate-600">Requires attention</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          onClick={() => setActiveModal("createStudent")}
          className="card hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Register Student</p>
              <p className="text-xs text-slate-500">
                Add new student to system
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveModal("enroll")}
          className="card hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Enroll Student</p>
              <p className="text-xs text-slate-500">Assign student to class</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveModal("search")}
          className="card hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Search className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Search Students</p>
              <p className="text-xs text-slate-500">Find by name or ID</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveModal("promote")}
          className="card hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Promote Students</p>
              <p className="text-xs text-slate-500">Bulk class promotion</p>
            </div>
          </div>
        </button>

        <Link to="/students" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">Manage Students</p>
              <p className="text-xs text-slate-500">Full student management</p>
            </div>
          </div>
        </Link>

        <Link to="/classes" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">View Classes</p>
              <p className="text-xs text-slate-500">Class information</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Enrollments Table */}
      <TableSection title="Recent Enrollments">
        <Table
          rows={recentEnrollments}
          loading={loading && !recentEnrollments.length}
          columns={[
            { key: "enrollmentId", title: "Enrollment ID" },
            { key: "student_label", title: "Student" },
            { key: "class_label", title: "Class" },
            { key: "enrolled_on", title: "Enrolled On" },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewHistory(row.studentId)}
                >
                  <History className="h-3 w-3 mr-1" />
                  History
                </Button>
              ),
            },
          ]}
          searchPlaceholder="Search recent enrollments..."
          pageSize={10}
          pageSizeOptions={[10, 20, 30]}
        />
      </TableSection>

      {/* Modals */}
      <Modal
        isOpen={activeModal === "createStudent"}
        onClose={() => setActiveModal(null)}
        title="Register New Student"
      >
        <StudentForm
          initialValues={{ fullName: "", gender: "" }}
          onSubmit={handleCreateStudent}
          loading={saving}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "enroll"}
        onClose={() => setActiveModal(null)}
        title="Enroll Student to Class"
      >
        <EnrollmentForm
          students={studentsQuery.data || []}
          classes={classesQuery.data || []}
          onSubmit={handleEnroll}
          loading={saving}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "search"}
        onClose={() => setActiveModal(null)}
        title="Search Students"
        size="large"
      >
        <StudentSearch
          onSearch={handleSearch}
          results={searchResults}
          loading={searchLoading}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "promote"}
        onClose={() => setActiveModal(null)}
        title="Promote Students"
      >
        <PromotionForm
          classes={classesQuery.data || []}
          terms={termsQuery.data || []}
          onSubmit={handlePromote}
          loading={saving}
        />
      </Modal>

      <Modal
        isOpen={activeModal === "history"}
        onClose={() => {
          setActiveModal(null);
          setSelectedStudentId(null);
        }}
        title="Student Academic History"
        size="large"
      >
        <EnrollmentHistory
          studentId={selectedStudentId}
          history={historyQuery.data}
          loading={historyQuery.loading}
        />
      </Modal>
    </div>
  );
};

export default RegistrarDashboard;
