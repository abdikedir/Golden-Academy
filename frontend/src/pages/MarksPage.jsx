import { useMemo, useState } from "react";
import marksApi from "../api/marksApi";
import subjectApi from "../api/subjectApi";
import teacherApi from "../api/teacherApi";
import studentApi from "../api/studentApi";
import { extractErrorMessage } from "../api/responseAdapter";
import PageLayout from "../components/layout/PageLayout";
import MarksForm from "../components/students/MarksForm";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal";
import Table from "../components/common/Table";
import TableSection from "../components/common/TableSection";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import { notify } from "../utils/notifications";

const MarksPage = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [editingMark, setEditingMark] = useState(null);
  const [deletingMark, setDeletingMark] = useState(null);
  const [editMarkValue, setEditMarkValue] = useState("");

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role).toUpperCase())
    : [];
  const isSystemAdmin = normalizedRoles.includes("SYSTEM_ADMIN");

  const marksQuery = useFetch(() => marksApi.getAll(), []);
  const subjectsQuery = useFetch(() => subjectApi.getAll(), []);
  const teachersQuery = useFetch(() => teacherApi.getAll(), []);
  const enrollmentsQuery = useFetch(
    () => studentApi.getEnrollments({ page: 1, limit: 200 }),
    [],
    true,
    { mode: "payload", initialData: { enrollments: [] } },
  );

  const subjectLookup = useMemo(
    () =>
      Object.fromEntries(
        (subjectsQuery.data || []).map((subject) => [
          subject.subject_id,
          subject.name,
        ]),
      ),
    [subjectsQuery.data],
  );

  const teacherLookup = useMemo(
    () =>
      Object.fromEntries(
        (teachersQuery.data || []).map((teacher) => [
          teacher.teacher_id,
          teacher.full_name,
        ]),
      ),
    [teachersQuery.data],
  );

  const submitMark = async (values) => {
    setSaving(true);
    try {
      await marksApi.submitMark({
        studentId: Number(values.student_id),
        teacherId: Number(values.teacher_id),
        enrollmentId: Number(values.enrollment_id),
        subjectId: Number(values.subject_id),
        markObtained: Number(values.mark_obtained),
      });
      notify({ type: "success", message: "Mark submitted" });
      await marksQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to submit mark"),
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditMark = (row) => {
    const markId = row.mark_id ?? row.markId;
    const currentMark = row.mark_obtained ?? row.markObtained ?? "";
    const teacherId =
      row.teacher_id ?? row.teacherId ?? row.teacher?.teacherId ?? null;

    setEditingMark({
      mark_id: markId,
      teacher_id: teacherId,
      label:
        row.enrollment?.student?.fullName ||
        row.student_name ||
        `Mark #${markId}`,
    });
    setEditMarkValue(String(currentMark));
  };

  const handleUpdateMark = async (event) => {
    event.preventDefault();
    if (!editingMark?.mark_id) return;

    const parsedMark = Number(editMarkValue);
    if (Number.isNaN(parsedMark) || parsedMark < 1 || parsedMark > 100) {
      notify({ type: "error", message: "Mark must be between 1 and 100" });
      return;
    }

    setSaving(true);
    try {
      await marksApi.update(editingMark.mark_id, {
        markObtained: parsedMark,
        teacherId: editingMark.teacher_id || undefined,
      });
      notify({ type: "success", message: "Mark updated" });
      setEditingMark(null);
      await marksQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to update mark"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMark = async () => {
    if (!deletingMark?.mark_id) return;

    setSaving(true);
    try {
      await marksApi.remove(deletingMark.mark_id);
      notify({ type: "success", message: "Mark deleted" });
      setDeletingMark(null);
      if (editingMark?.mark_id === deletingMark.mark_id) {
        setEditingMark(null);
      }
      await marksQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete mark"),
      });
    } finally {
      setSaving(false);
    }
  };

  const markColumns = [
    { key: "mark_id", title: "ID" },
    { key: "enrollment_id", title: "Enrollment" },
    {
      key: "subject_id",
      title: "Subject",
      render: (row) =>
        row.subject_name ||
        subjectLookup[row.subject_id] ||
        row.subject_id ||
        "-",
    },
    {
      key: "teacher_id",
      title: "Teacher",
      render: (row) =>
        row.teacher_name ||
        teacherLookup[row.teacher_id] ||
        row.teacher_id ||
        "-",
    },
    { key: "mark_obtained", title: "Mark" },
  ];

  if (isSystemAdmin) {
    markColumns.push({
      key: "actions",
      title: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditMark(row)}
            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() =>
              setDeletingMark({
                mark_id: row.mark_id ?? row.markId,
                label:
                  row.enrollment?.student?.fullName ||
                  row.student_name ||
                  `Mark #${row.mark_id ?? row.markId}`,
              })
            }
            className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      ),
    });
  }

  return (
    <PageLayout title="Marks">
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Submit or Validate Marks</h3>
        <MarksForm
          enrollments={enrollmentsQuery.data?.enrollments || []}
          subjects={subjectsQuery.data}
          teachers={teachersQuery.data}
          onSubmit={submitMark}
          loading={saving}
        />
      </div>

      <TableSection title="Submitted Marks">
        <Table
          rows={marksQuery.data}
          loading={marksQuery.loading}
          error={marksQuery.error}
          searchPlaceholder="Search by student, subject, teacher, class, or mark"
          columns={markColumns}
        />
      </TableSection>

      <Modal
        open={Boolean(editingMark)}
        title="Update Mark"
        onClose={() => !saving && setEditingMark(null)}
      >
        <form onSubmit={handleUpdateMark} className="space-y-3">
          <p className="text-xs text-slate-600">{editingMark?.label || "-"}</p>
          <Input
            label="Mark Obtained"
            name="mark_obtained"
            type="number"
            value={editMarkValue}
            onChange={(event) => setEditMarkValue(event.target.value)}
            required
          />
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </form>
      </Modal>

      <DeleteConfirmModal
        open={Boolean(deletingMark)}
        title="Delete mark?"
        description={`This will remove ${deletingMark?.label || "this mark entry"}.`}
        confirmText="Delete Mark"
        loading={saving}
        onCancel={() => !saving && setDeletingMark(null)}
        onConfirm={handleDeleteMark}
      />
    </PageLayout>
  );
};

export default MarksPage;
