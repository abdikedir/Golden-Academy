import { useMemo, useState } from "react";
import teacherApi from "../api/teacherApi";
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

const createTeacherRoleOptions = [
  { value: "TEACHER", label: "Teacher" },
  { value: "DEPARTMENT_ADMIN", label: "Department Admin" },
  { value: "REGISTRAR", label: "Registrar" },
];

const TeachersPage = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deletingTeacher, setDeletingTeacher] = useState(null);
  const [editValues, setEditValues] = useState({
    full_name: "",
    department_id: "",
  });
  const teacherQuery = useFetch(() => teacherApi.getAll(), []);
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

  const roleOptions = useMemo(() => {
    const roles = user?.roles || [];
    const isDeptAdminOnly =
      roles.includes("DEPARTMENT_ADMIN") &&
      !roles.includes("SYSTEM_ADMIN") &&
      !roles.includes("REGISTRAR");

    if (isDeptAdminOnly) {
      return createTeacherRoleOptions.filter(
        (role) => role.value === "TEACHER",
      );
    }

    return createTeacherRoleOptions;
  }, [user?.roles]);

  const form = useForm({
    initialValues: {
      full_name: "",
      email: "",
      password: "",
      role_name: "TEACHER",
      department_id: "",
    },
    validate: (values) => validateForm("teacher", values),
    onSubmit: async (values) => {
      setSaving(true);
      try {
        await teacherApi.create({
          fullName: values.full_name,
          email: values.email,
          password: values.password,
          roleName: values.role_name,
          departmentId: values.department_id
            ? Number(values.department_id)
            : null,
        });
        notify({ type: "success", message: "Teacher account created" });
        form.reset();
        await teacherQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: extractErrorMessage(error, "Failed to create teacher"),
        });
      } finally {
        setSaving(false);
      }
    },
  });

  const openEditTeacher = (teacher) => {
    const teacherId = teacher.teacher_id ?? teacher.teacherId;
    setEditingTeacher({
      teacher_id: teacherId,
      full_name: teacher.full_name ?? teacher.fullName ?? "",
      department_id: teacher.department_id ?? teacher.departmentId ?? "",
    });
    setEditValues({
      full_name: teacher.full_name ?? teacher.fullName ?? "",
      department_id: String(
        teacher.department_id ?? teacher.departmentId ?? "",
      ),
    });
  };

  const handleUpdateTeacher = async (event) => {
    event.preventDefault();
    if (!editingTeacher?.teacher_id) return;

    if (!editValues.full_name.trim()) {
      notify({ type: "error", message: "Teacher name is required" });
      return;
    }

    setSaving(true);
    try {
      await teacherApi.update(editingTeacher.teacher_id, {
        fullName: editValues.full_name.trim(),
        departmentId: editValues.department_id
          ? Number(editValues.department_id)
          : null,
      });
      notify({ type: "success", message: "Teacher updated" });
      setEditingTeacher(null);
      await teacherQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to update teacher"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher?.teacher_id) return;

    setSaving(true);
    try {
      await teacherApi.remove(deletingTeacher.teacher_id);
      notify({ type: "success", message: "Teacher deleted" });
      setDeletingTeacher(null);
      if (editingTeacher?.teacher_id === deletingTeacher.teacher_id) {
        setEditingTeacher(null);
      }
      await teacherQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete teacher"),
      });
    } finally {
      setSaving(false);
    }
  };

  const teacherColumns = [
    { key: "teacher_id", title: "ID" },
    { key: "full_name", title: "Name" },
    {
      key: "user_id",
      title: "User",
      render: (row) => row.user?.email || row.user_email || row.user_id || "-",
    },
    {
      key: "department_id",
      title: "Department",
      render: (row) =>
        row.department?.name ||
        row.department_name ||
        departmentLookup[row.department_id] ||
        row.department_id ||
        "-",
    },
  ];

  if (isSystemAdmin) {
    teacherColumns.push({
      key: "actions",
      title: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditTeacher(row)}
            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() =>
              setDeletingTeacher({
                teacher_id: row.teacher_id ?? row.teacherId,
                full_name: row.full_name ?? row.fullName,
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
    <PageLayout title="Teachers">
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Create Teacher</h3>
        <form
          onSubmit={form.handleSubmit}
          className="grid gap-3 md:grid-cols-6"
        >
          <Input
            label="Full Name"
            name="full_name"
            value={form.values.full_name}
            onChange={form.handleChange}
            error={form.errors.full_name}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.values.email}
            onChange={form.handleChange}
            error={form.errors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.values.password}
            onChange={form.handleChange}
            error={form.errors.password}
          />
          <Select
            label="Role"
            name="role_name"
            value={form.values.role_name}
            onChange={form.handleChange}
            options={roleOptions}
            error={form.errors.role_name}
          />
          <Select
            label="Department"
            name="department_id"
            value={form.values.department_id}
            onChange={form.handleChange}
            options={(departmentQuery.data || []).map((d) => ({
              value: d.department_id,
              label: d.name,
            }))}
            error={form.errors.department_id}
          />
          <div className="flex items-end md:col-span-1">
            <Button type="submit" loading={saving}>
              Save Teacher
            </Button>
          </div>
        </form>
      </div>

      <TableSection title="Teacher List">
        <Table
          rows={teacherQuery.data}
          loading={teacherQuery.loading}
          error={teacherQuery.error}
          columns={teacherColumns}
        />
      </TableSection>

      <Modal
        open={Boolean(editingTeacher)}
        title="Update Teacher"
        onClose={() => !saving && setEditingTeacher(null)}
      >
        <form
          onSubmit={handleUpdateTeacher}
          className="grid gap-3 md:grid-cols-2"
        >
          <Input
            label="Full Name"
            name="full_name"
            value={editValues.full_name}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                full_name: event.target.value,
              }))
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
          <div className="md:col-span-2">
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        open={Boolean(deletingTeacher)}
        title="Delete teacher?"
        description={`This will remove ${deletingTeacher?.full_name || "this teacher"}.`}
        confirmText="Delete Teacher"
        loading={saving}
        onCancel={() => !saving && setDeletingTeacher(null)}
        onConfirm={handleDeleteTeacher}
      />
    </PageLayout>
  );
};

export default TeachersPage;
