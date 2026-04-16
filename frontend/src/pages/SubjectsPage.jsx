import { useMemo, useState } from "react";
import subjectApi from "../api/subjectApi";
import departmentApi from "../api/departmentApi";
import PageLayout from "../components/layout/PageLayout";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal";
import Table from "../components/common/Table";
import TableSection from "../components/common/TableSection";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import { useForm } from "../hooks/useForm";
import { validateForm } from "../utils/validateForm";
import { extractErrorMessage } from "../api/responseAdapter";
import { notify } from "../utils/notifications";

const SubjectsPage = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [editValues, setEditValues] = useState({
    name: "",
    code: "",
    department_id: "",
    total_mark: "100",
  });
  const subjectQuery = useFetch(() => subjectApi.getAll(), []);
  const departmentQuery = useFetch(() => departmentApi.getAll(), []);

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role).toUpperCase())
    : [];
  const isSystemAdmin = normalizedRoles.includes("SYSTEM_ADMIN");

  const departmentLookup = useMemo(
    () =>
      Object.fromEntries(
        (departmentQuery.data || []).map((department) => [
          department.department_id,
          department.name,
        ]),
      ),
    [departmentQuery.data],
  );

  const form = useForm({
    initialValues: { name: "", code: "", department_id: "", total_mark: "100" },
    validate: (values) => validateForm("subject", values),
    onSubmit: async (values) => {
      setSaving(true);
      try {
        await subjectApi.create({
          ...values,
          department_id: values.department_id
            ? Number(values.department_id)
            : null,
          total_mark: Number(values.total_mark),
        });
        notify({ type: "success", message: "Subject created" });
        form.reset();
        await subjectQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: error?.response?.data?.message || "Failed to create subject",
        });
      } finally {
        setSaving(false);
      }
    },
  });

  const openEditSubject = (subject) => {
    const subjectId = subject.subject_id ?? subject.subjectId;
    setEditingSubject({
      subject_id: subjectId,
      name: subject.name || "",
      code: subject.code || "",
      department_id: subject.department_id ?? subject.departmentId ?? "",
      total_mark: subject.total_mark ?? subject.totalMark ?? 100,
    });
    setEditValues({
      name: subject.name || "",
      code: subject.code || "",
      department_id: String(
        subject.department_id ?? subject.departmentId ?? "",
      ),
      total_mark: String(subject.total_mark ?? subject.totalMark ?? 100),
    });
  };

  const handleUpdateSubject = async (event) => {
    event.preventDefault();
    if (!editingSubject?.subject_id) return;

    if (!editValues.name.trim() || !editValues.code.trim()) {
      notify({ type: "error", message: "Subject name and code are required" });
      return;
    }

    setSaving(true);
    try {
      await subjectApi.update(editingSubject.subject_id, {
        name: editValues.name.trim(),
        code: editValues.code.trim(),
        departmentId: editValues.department_id
          ? Number(editValues.department_id)
          : null,
        totalMark: Number(editValues.total_mark),
      });
      notify({ type: "success", message: "Subject updated" });
      setEditingSubject(null);
      await subjectQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to update subject"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject?.subject_id) return;

    setSaving(true);
    try {
      await subjectApi.remove(deletingSubject.subject_id);
      notify({ type: "success", message: "Subject deleted" });
      setDeletingSubject(null);
      if (editingSubject?.subject_id === deletingSubject.subject_id) {
        setEditingSubject(null);
      }
      await subjectQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete subject"),
      });
    } finally {
      setSaving(false);
    }
  };

  const subjectColumns = [
    { key: "subject_id", title: "ID" },
    { key: "name", title: "Name" },
    { key: "code", title: "Code" },
    {
      key: "department_id",
      title: "Department",
      render: (row) =>
        row.department_name ||
        departmentLookup[row.department_id] ||
        row.department_id ||
        "-",
    },
    { key: "total_mark", title: "Total Mark" },
  ];

  if (isSystemAdmin) {
    subjectColumns.push({
      key: "actions",
      title: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditSubject(row)}
            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() =>
              setDeletingSubject({
                subject_id: row.subject_id ?? row.subjectId,
                name: row.name,
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
    <PageLayout title="Subjects">
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Create Subject</h3>
        <form
          onSubmit={form.handleSubmit}
          className="grid gap-3 md:grid-cols-4"
        >
          <Input
            label="Name"
            name="name"
            value={form.values.name}
            onChange={form.handleChange}
            error={form.errors.name}
          />
          <Input
            label="Code"
            name="code"
            value={form.values.code}
            onChange={form.handleChange}
            error={form.errors.code}
          />
          <Select
            label="Department"
            name="department_id"
            value={form.values.department_id}
            onChange={form.handleChange}
            options={departmentQuery.data.map((d) => ({
              value: d.department_id,
              label: d.name,
            }))}
            error={form.errors.department_id}
          />
          <Input
            label="Total Mark"
            name="total_mark"
            type="number"
            value={form.values.total_mark}
            onChange={form.handleChange}
            error={form.errors.total_mark}
          />
          <div className="md:col-span-4">
            <Button type="submit" loading={saving}>
              Save Subject
            </Button>
          </div>
        </form>
      </div>

      <TableSection title="Subject List">
        <Table
          rows={subjectQuery.data}
          loading={subjectQuery.loading}
          error={subjectQuery.error}
          columns={subjectColumns}
        />
      </TableSection>

      <Modal
        open={Boolean(editingSubject)}
        title="Update Subject"
        onClose={() => !saving && setEditingSubject(null)}
      >
        <form
          onSubmit={handleUpdateSubject}
          className="grid gap-3 md:grid-cols-2"
        >
          <Input
            label="Name"
            name="name"
            value={editValues.name}
            onChange={(event) =>
              setEditValues((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
          <Input
            label="Code"
            name="code"
            value={editValues.code}
            onChange={(event) =>
              setEditValues((prev) => ({ ...prev, code: event.target.value }))
            }
            required
          />
          <Select
            label="Department"
            name="department_id"
            value={editValues.department_id}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                department_id: event.target.value,
              }))
            }
            options={(departmentQuery.data || []).map((d) => ({
              value: d.department_id,
              label: d.name,
            }))}
          />
          <Input
            label="Total Mark"
            name="total_mark"
            type="number"
            value={editValues.total_mark}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                total_mark: event.target.value,
              }))
            }
          />
          <div className="md:col-span-2">
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        open={Boolean(deletingSubject)}
        title="Delete subject?"
        description={`This will remove ${deletingSubject?.name || "this subject"}.`}
        confirmText="Delete Subject"
        loading={saving}
        onCancel={() => !saving && setDeletingSubject(null)}
        onConfirm={handleDeleteSubject}
      />
    </PageLayout>
  );
};

export default SubjectsPage;
