import { useState } from "react";
import departmentApi from "../api/departmentApi";
import PageLayout from "../components/layout/PageLayout";
import Input from "../components/common/Input";
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

const DepartmentsPage = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [deletingDepartment, setDeletingDepartment] = useState(null);
  const [editValues, setEditValues] = useState({ name: "", code: "" });
  const departmentQuery = useFetch(() => departmentApi.getAll(), []);

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role).toUpperCase())
    : [];
  const isSystemAdmin = normalizedRoles.includes("SYSTEM_ADMIN");

  const form = useForm({
    initialValues: { name: "", code: "" },
    validate: (values) => validateForm("department", values),
    onSubmit: async (values) => {
      setSaving(true);
      try {
        await departmentApi.create(values);
        notify({ type: "success", message: "Department created" });
        form.reset();
        await departmentQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message:
            error?.response?.data?.message || "Failed to create department",
        });
      } finally {
        setSaving(false);
      }
    },
  });

  const openEditDepartment = (department) => {
    const departmentId = department.department_id ?? department.departmentId;
    const values = {
      name: department.name || "",
      code: department.code || "",
    };

    setEditingDepartment({ department_id: departmentId, ...values });
    setEditValues(values);
  };

  const handleUpdateDepartment = async (event) => {
    event.preventDefault();
    if (!editingDepartment?.department_id) return;

    if (!editValues.name.trim() || !editValues.code.trim()) {
      notify({ type: "error", message: "Name and code are required" });
      return;
    }

    setSaving(true);
    try {
      await departmentApi.update(editingDepartment.department_id, {
        name: editValues.name.trim(),
        code: editValues.code.trim(),
      });
      notify({ type: "success", message: "Department updated" });
      setEditingDepartment(null);
      await departmentQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to update department"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment?.department_id) return;

    setSaving(true);
    try {
      await departmentApi.remove(deletingDepartment.department_id);
      notify({ type: "success", message: "Department deleted" });
      setDeletingDepartment(null);
      if (
        editingDepartment?.department_id === deletingDepartment.department_id
      ) {
        setEditingDepartment(null);
      }
      await departmentQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete department"),
      });
    } finally {
      setSaving(false);
    }
  };

  const departmentColumns = [
    { key: "department_id", title: "ID" },
    { key: "name", title: "Name" },
    { key: "code", title: "Code" },
  ];

  if (isSystemAdmin) {
    departmentColumns.push({
      key: "actions",
      title: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditDepartment(row)}
            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() =>
              setDeletingDepartment({
                department_id: row.department_id ?? row.departmentId,
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
    <PageLayout title="Departments">
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Create Department</h3>
        <form
          onSubmit={form.handleSubmit}
          className="grid gap-3 md:grid-cols-3"
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
          <div className="flex items-end">
            <Button type="submit" loading={saving}>
              Save Department
            </Button>
          </div>
        </form>
      </div>

      <TableSection title="Department List">
        <Table
          rows={departmentQuery.data}
          loading={departmentQuery.loading}
          error={departmentQuery.error}
          columns={departmentColumns}
        />
      </TableSection>

      <Modal
        open={Boolean(editingDepartment)}
        title="Update Department"
        onClose={() => !saving && setEditingDepartment(null)}
      >
        <form
          onSubmit={handleUpdateDepartment}
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
          <div className="md:col-span-2">
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        open={Boolean(deletingDepartment)}
        title="Delete department?"
        description={`This will remove ${deletingDepartment?.name || "this department"}.`}
        confirmText="Delete Department"
        loading={saving}
        onCancel={() => !saving && setDeletingDepartment(null)}
        onConfirm={handleDeleteDepartment}
      />
    </PageLayout>
  );
};

export default DepartmentsPage;
