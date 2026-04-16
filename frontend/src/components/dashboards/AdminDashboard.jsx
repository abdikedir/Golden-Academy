import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import userApi from "../../api/userApi";
import departmentApi from "../../api/departmentApi";
import termApi from "../../api/termApi";
import classApi from "../../api/classApi";
import teacherApi from "../../api/teacherApi";
import subjectApi from "../../api/subjectApi";
import auditApi from "../../api/auditApi";
import roleApi from "../../api/roleApi";
import { extractPayload } from "../../api/responseAdapter";
import Table from "../common/Table";
import TableSection from "../common/TableSection";
import StateView from "../common/StateView";
import Modal from "../common/Modal";
import DeleteConfirmModal from "../common/DeleteConfirmModal";
import Button from "../common/Button";
import Input from "../common/Input";
import Select from "../common/Select";
import { useFetch } from "../../hooks/useFetch";
import { useForm } from "../../hooks/useForm";
import { useAuth } from "../../hooks/useAuth";
import { notify } from "../../utils/notifications";

const actionLinks = [
  {
    title: "Manage Departments",
    description: "Create and maintain school departments.",
    path: "/departments",
  },
  {
    title: "Manage Terms",
    description: "Track and maintain academic terms.",
    path: "/terms",
  },
  {
    title: "Review Classes",
    description: "Audit class setup and publication status.",
    path: "/classes",
  },
  {
    title: "Open Reports",
    description: "Review institution-wide outcomes.",
    path: "/reports",
  },
];

const AdminDashboard = () => {
  const { user: authUser } = useAuth();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignClassSubjectModalOpen, setAssignClassSubjectModalOpen] =
    useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const usersQuery = useFetch(() => userApi.getWithRoles(), []);
  const departmentsQuery = useFetch(() => departmentApi.getAll(), []);
  const termsQuery = useFetch(() => termApi.getAll(), []);
  const classesQuery = useFetch(() => classApi.getAll(), []);
  const teachersQuery = useFetch(() => teacherApi.getAll(), []);
  const subjectsQuery = useFetch(() => subjectApi.getAll(), []);
  const rolesQuery = useFetch(() => roleApi.getAll(), []);
  const auditQuery = useFetch(
    () => auditApi.getAll({ page: 1, limit: 20 }),
    [],
    true,
    { mode: "payload", initialData: { logs: [] } },
  );

  const loading =
    usersQuery.loading ||
    departmentsQuery.loading ||
    termsQuery.loading ||
    classesQuery.loading;

  const errors = [
    usersQuery.error,
    departmentsQuery.error,
    termsQuery.error,
    classesQuery.error,
    teachersQuery.error,
    subjectsQuery.error,
  ].filter(Boolean);

  // User form
  const userForm = useForm({
    initialValues: {
      email: "",
      password: "",
      is_active: true,
    },
    onSubmit: async (values) => {
      setSubmitting(true);
      const isActive =
        values.is_active === true || String(values.is_active) === "true";
      try {
        if (editingUser) {
          await userApi.update(editingUser.user_id, {
            email: values.email,
            isActive,
          });
          notify({ type: "success", message: "User updated successfully" });
        } else {
          await userApi.create({
            email: values.email,
            password: values.password,
            isActive,
          });
          notify({ type: "success", message: "User created successfully" });
        }
        setUserModalOpen(false);
        setEditingUser(null);
        userForm.reset();
        usersQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message:
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            "Failed to save user",
        });
      } finally {
        setSubmitting(false);
      }
    },
    validate: (values) => {
      const errors = {};
      if (!values.email) errors.email = "Email is required";
      if (!editingUser && !values.password)
        errors.password = "Password is required";
      return errors;
    },
  });

  // Department form
  const departmentForm = useForm({
    initialValues: {
      name: "",
      code: "",
    },
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        if (editingDepartment) {
          await departmentApi.update(editingDepartment.department_id, values);
          notify({
            type: "success",
            message: "Department updated successfully",
          });
        } else {
          await departmentApi.create(values);
          notify({
            type: "success",
            message: "Department created successfully",
          });
        }
        setDepartmentModalOpen(false);
        setEditingDepartment(null);
        departmentForm.reset();
        departmentsQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message: error.response?.data?.error || "Failed to save department",
        });
      } finally {
        setSubmitting(false);
      }
    },
    validate: (values) => {
      const errors = {};
      if (!values.name) errors.name = "Name is required";
      if (!values.code) errors.code = "Code is required";
      return errors;
    },
  });

  // Role assignment form
  const roleForm = useForm({
    initialValues: {
      role_id: "",
    },
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        await userApi.assignRole(selectedUser.user_id, {
          roleId: parseInt(values.role_id),
        });
        notify({ type: "success", message: "Role assigned successfully" });
        setRoleModalOpen(false);
        setSelectedUser(null);
        roleForm.reset();
        usersQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message:
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            "Failed to assign role",
        });
      } finally {
        setSubmitting(false);
      }
    },
    validate: (values) => {
      const errors = {};
      if (!values.role_id) errors.role_id = "Role is required";
      return errors;
    },
  });

  // Assign teacher to class-subject form
  const assignClassSubjectForm = useForm({
    initialValues: {
      teacher_id: "",
      class_id: "",
      subject_id: "",
    },
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const classId = parseInt(values.class_id, 10);
        const subjectId = parseInt(values.subject_id, 10);
        const teacherId = parseInt(values.teacher_id, 10);

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

        await teacherApi.assignToSubject({
          teacherId,
          classSubjectId: Number(classSubjectId),
        });

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
          message:
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            "Failed to assign teacher to class",
        });
      } finally {
        setSubmitting(false);
      }
    },
    validate: (values) => {
      const errors = {};
      if (!values.teacher_id) errors.teacher_id = "Teacher is required";
      if (!values.class_id) errors.class_id = "Class is required";
      if (!values.subject_id) errors.subject_id = "Subject is required";
      return errors;
    },
  });

  const termLookup = useMemo(
    () =>
      Object.fromEntries(
        (termsQuery.data || []).map((term) => [
          term.term_id,
          `${term.academic_year} / ${term.semester}`,
        ]),
      ),
    [termsQuery.data],
  );

  const latestTerm = useMemo(
    () =>
      [...(termsQuery.data || [])].sort(
        (a, b) => Number(b.term_id) - Number(a.term_id),
      )[0],
    [termsQuery.data],
  );

  const normalizedUsers = useMemo(
    () =>
      (usersQuery.data || []).map((user) => ({
        ...user,
        user_id: user.user_id ?? user.userId ?? null,
        is_active: user.is_active ?? user.isActive ?? true,
      })),
    [usersQuery.data],
  );

  const activeUsers = normalizedUsers.filter(
    (user) => user.is_active !== false,
  ).length;

  const unpublishedClasses = (classesQuery.data || []).filter(
    (classRow) => !classRow.results_published,
  );

  const recentUsers = [...normalizedUsers]
    .sort((a, b) => Number(b.user_id) - Number(a.user_id))
    .slice(0, 8)
    .map((user) => ({
      ...user,
      role_names: Array.isArray(user.roles) ? user.roles.join(", ") : "-",
      status_label: user.is_active === false ? "Inactive" : "Active",
    }));

  const pendingClassRows = unpublishedClasses.slice(0, 10).map((classRow) => ({
    ...classRow,
    term_label:
      termLookup[classRow.term_id] ||
      (classRow.term_id ? `Term ${classRow.term_id}` : "-") ||
      "-",
  }));

  const auditLogs = (auditQuery.data?.logs || []).map((log) => ({
    ...log,
    user_email: log.user?.email || "-",
    created_at_formatted: new Date(log.created_at).toLocaleString(),
  }));

  const roleOptions = (rolesQuery.data || []).map((role) => ({
    value: role.role_id,
    label: role.name,
  }));

  const teacherOptions = (teachersQuery.data || []).map((teacher) => ({
    value: teacher.teacher_id ?? teacher.teacherId,
    label: teacher.full_name ?? teacher.fullName,
  }));

  const classOptions = (classesQuery.data || []).map((classRow) => ({
    value: classRow.class_id ?? classRow.classId,
    label: `${classRow.grade || "Grade"} - ${classRow.class_name || classRow.className || "Class"}`,
  }));

  const subjectOptions = (subjectsQuery.data || []).map((subject) => ({
    value: subject.subject_id ?? subject.subjectId,
    label: `${subject.name} (${subject.code || "-"})`,
  }));

  const currentUserId = authUser?.user_id ?? authUser?.userId;

  const refreshAll = async () => {
    await Promise.allSettled([
      usersQuery.refetch(),
      departmentsQuery.refetch(),
      termsQuery.refetch(),
      classesQuery.refetch(),
      teachersQuery.refetch(),
      subjectsQuery.refetch(),
      auditQuery.refetch(),
    ]);
  };

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      user_id: user.user_id ?? user.userId,
      is_active: user.is_active ?? user.isActive ?? true,
    });
    userForm.setValues({
      email: user.email,
      password: "",
      is_active: (user.is_active ?? user.isActive ?? true) !== false,
    });
    setUserModalOpen(true);
  };

  const openDeleteModal = (target) => {
    setDeleteTarget(target);
    setConfirmModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteSubmitting) return;
    setConfirmModalOpen(false);
    setDeleteTarget(null);
  };

  const handleDeleteUser = (userId, email) => {
    if (!userId) {
      notify({
        type: "error",
        message: "Missing user ID. Please refresh and try again.",
      });
      return;
    }

    openDeleteModal({
      type: "user",
      userId,
      title: "Delete this user account?",
      description: `You are about to remove ${email || `user #${userId}`}. This action cannot be undone.`,
      confirmLabel: "Delete user",
      theme: "danger",
      notice: "This action is permanent and may affect linked records.",
    });
  };

  const handleAssignRole = (user) => {
    if (String(user.user_id ?? user.userId) === String(currentUserId)) {
      notify({
        type: "warning",
        message: "You cannot change your own role.",
      });
      return;
    }

    setSelectedUser({
      ...user,
      user_id: user.user_id ?? user.userId,
    });
    roleForm.reset();
    setRoleModalOpen(true);
  };

  const handleRemoveRole = (userId, roleId, email = "selected user") => {
    if (String(userId) === String(currentUserId)) {
      notify({
        type: "warning",
        message: "You cannot change your own role.",
      });
      return;
    }

    if (!userId || !roleId) {
      notify({
        type: "error",
        message: "Missing role information. Please refresh and try again.",
      });
      return;
    }

    openDeleteModal({
      type: "role",
      userId,
      roleId,
      title: "Remove this role assignment?",
      description: `This will remove role #${roleId} from ${email}.`,
      confirmLabel: "Remove role",
      theme: "warning",
      notice: "Access permissions will change immediately after confirmation.",
    });
  };

  const handleEditDepartment = (department) => {
    setEditingDepartment(department);
    departmentForm.setValues({
      name: department.name,
      code: department.code,
    });
    setDepartmentModalOpen(true);
  };

  const handleDeleteDepartment = (departmentId, departmentName) => {
    if (!departmentId) {
      notify({
        type: "error",
        message: "Missing department ID. Please refresh and try again.",
      });
      return;
    }

    openDeleteModal({
      type: "department",
      departmentId,
      title: "Delete this department?",
      description: `Department ${departmentName || `#${departmentId}`} will be permanently removed.`,
      confirmLabel: "Delete department",
      theme: "danger",
      notice: "Deleting a department can impact related teachers and subjects.",
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);
    try {
      if (deleteTarget.type === "user") {
        await userApi.remove(deleteTarget.userId);
        notify({ type: "success", message: "User deleted successfully" });
        await usersQuery.refetch();
      }

      if (deleteTarget.type === "department") {
        await departmentApi.remove(deleteTarget.departmentId);
        notify({ type: "success", message: "Department deleted successfully" });
        await departmentsQuery.refetch();
      }

      if (deleteTarget.type === "role") {
        await userApi.removeRole(deleteTarget.userId, {
          roleId: deleteTarget.roleId,
        });
        notify({ type: "success", message: "Role removed successfully" });
        await usersQuery.refetch();
      }

      setConfirmModalOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      notify({
        type: "error",
        message:
          error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to complete delete action",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      const response = await auditApi.exportLogs();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit-logs-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      notify({ type: "success", message: "Audit logs exported successfully" });
    } catch (error) {
      notify({
        type: "error",
        message: error.response?.data?.error || "Failed to export audit logs",
      });
    }
  };

  return (
    <div className="space-y-4">
      {errors.length ? (
        <StateView
          type="error"
          title="Some dashboard data failed to load"
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="metric-item">
          <p className="metric-label">Users</p>
          <p className="metric-value">{usersQuery.data.length}</p>
          <p className="mt-1 text-xs text-slate-600">{activeUsers} active</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Departments</p>
          <p className="metric-value">{departmentsQuery.data.length}</p>
          <p className="mt-1 text-xs text-slate-600">Governance units</p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Terms</p>
          <p className="metric-value">{termsQuery.data.length}</p>
          <p className="mt-1 text-xs text-slate-600">
            Current:{" "}
            {latestTerm
              ? `${latestTerm.academic_year} ${latestTerm.semester}`
              : "-"}
          </p>
        </div>
        <div className="metric-item">
          <p className="metric-label">Pending Publication</p>
          <p className="metric-value">{unpublishedClasses.length}</p>
          <p className="mt-1 text-xs text-slate-600">
            Classes not yet published
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actionLinks.map((link) => (
          <Link key={link.title} to={link.path} className="card">
            <p className="text-sm font-semibold text-slate-800">{link.title}</p>
            <p className="mt-1 text-xs text-slate-500">{link.description}</p>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            assignClassSubjectForm.reset();
            setAssignClassSubjectModalOpen(true);
          }}
          className="card text-left"
        >
          <p className="text-sm font-semibold text-slate-800">
            Assign Teacher To Class
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Map teacher to class and subject using existing assignment rules.
          </p>
        </button>
      </div>

      {/* User Management Section */}
      <TableSection
        title="User Management"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditingUser(null);
              userForm.reset();
              setUserModalOpen(true);
            }}
          >
            Create User
          </Button>
        }
      >
        <Table
          rows={recentUsers}
          loading={loading && !recentUsers.length}
          columns={[
            { key: "user_id", title: "User ID" },
            { key: "email", title: "Email" },
            { key: "role_names", title: "Roles" },
            { key: "status_label", title: "Status" },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditUser(row)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Edit
                  </button>
                  {String(row.user_id) === String(currentUserId) ? (
                    <span className="text-xs text-slate-400">Own account</span>
                  ) : (
                    <button
                      onClick={() => handleAssignRole(row)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Assign Role
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteUser(row.user_id, row.email)}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          searchPlaceholder="Search users..."
          pageSize={8}
          pageSizeOptions={[8, 16, 24]}
        />
      </TableSection>

      {/* Department Management Section */}
      <TableSection
        title="Department Management"
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEditingDepartment(null);
              departmentForm.reset();
              setDepartmentModalOpen(true);
            }}
          >
            Create Department
          </Button>
        }
      >
        <Table
          rows={departmentsQuery.data || []}
          loading={departmentsQuery.loading}
          error={departmentsQuery.error}
          columns={[
            { key: "department_id", title: "ID" },
            { key: "name", title: "Name" },
            { key: "code", title: "Code" },
            {
              key: "actions",
              title: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditDepartment(row)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteDepartment(row.department_id, row.name)
                    }
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          searchPlaceholder="Search departments..."
          pageSize={10}
          pageSizeOptions={[10, 20, 30]}
        />
      </TableSection>

      {/* Audit Log Section */}
      <TableSection
        title="Recent Audit Activities"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAuditModalOpen(true)}>
              View All
            </Button>
            <Button variant="secondary" onClick={handleExportAuditLogs}>
              Export
            </Button>
          </div>
        }
      >
        <Table
          rows={auditLogs}
          loading={auditQuery.loading}
          error={auditQuery.error}
          columns={[
            { key: "audit_log_id", title: "ID" },
            { key: "user_email", title: "User" },
            { key: "action", title: "Action" },
            { key: "resource_type", title: "Resource" },
            { key: "resource_id", title: "Resource ID" },
            { key: "created_at_formatted", title: "Timestamp" },
          ]}
          searchPlaceholder="Search audit logs..."
          pageSize={10}
          pageSizeOptions={[10, 20, 30]}
        />
      </TableSection>

      <TableSection title="Classes Awaiting Results Publication">
        <Table
          rows={pendingClassRows}
          loading={classesQuery.loading}
          error={classesQuery.error}
          columns={[
            { key: "class_id", title: "Class ID" },
            { key: "class_name", title: "Class" },
            { key: "grade", title: "Grade" },
            { key: "term_label", title: "Term" },
            {
              key: "homeroom_teacher_id",
              title: "Homeroom Teacher",
              render: (row) => row.homeroom_teacher_id || "-",
            },
          ]}
          searchPlaceholder="Search pending classes..."
          pageSize={10}
          pageSizeOptions={[10, 20, 30]}
        />
      </TableSection>

      {/* User Modal */}
      <DeleteConfirmModal
        open={confirmModalOpen}
        title={deleteTarget?.title}
        description={deleteTarget?.description}
        confirmText={deleteTarget?.confirmLabel || "Delete"}
        theme={deleteTarget?.theme || "danger"}
        notice={deleteTarget?.notice}
        loading={deleteSubmitting}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      <Modal
        open={userModalOpen}
        title={editingUser ? "Edit User" : "Create User"}
        onClose={() => {
          setUserModalOpen(false);
          setEditingUser(null);
          userForm.reset();
        }}
      >
        <form onSubmit={userForm.handleSubmit} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            value={userForm.values.email}
            onChange={userForm.handleChange}
            error={userForm.errors.email}
            required
          />
          {!editingUser && (
            <Input
              label="Password"
              name="password"
              type="password"
              value={userForm.values.password}
              onChange={userForm.handleChange}
              error={userForm.errors.password}
              required
            />
          )}
          <Select
            label="Status"
            name="is_active"
            value={userForm.values.is_active}
            onChange={userForm.handleChange}
            options={[
              { value: true, label: "Active" },
              { value: false, label: "Inactive" },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setUserModalOpen(false);
                setEditingUser(null);
                userForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingUser ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Role Assignment Modal */}
      <Modal
        open={roleModalOpen}
        title={`Assign Role to ${selectedUser?.email || ""}`}
        onClose={() => {
          setRoleModalOpen(false);
          setSelectedUser(null);
          roleForm.reset();
        }}
      >
        <form onSubmit={roleForm.handleSubmit} className="space-y-4">
          <Select
            label="Role"
            name="role_id"
            value={roleForm.values.role_id}
            onChange={roleForm.handleChange}
            error={roleForm.errors.role_id}
            options={roleOptions}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setRoleModalOpen(false);
                setSelectedUser(null);
                roleForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Assign Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Department Modal */}
      <Modal
        open={departmentModalOpen}
        title={editingDepartment ? "Edit Department" : "Create Department"}
        onClose={() => {
          setDepartmentModalOpen(false);
          setEditingDepartment(null);
          departmentForm.reset();
        }}
      >
        <form onSubmit={departmentForm.handleSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            value={departmentForm.values.name}
            onChange={departmentForm.handleChange}
            error={departmentForm.errors.name}
            required
          />
          <Input
            label="Code"
            name="code"
            value={departmentForm.values.code}
            onChange={departmentForm.handleChange}
            error={departmentForm.errors.code}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDepartmentModalOpen(false);
                setEditingDepartment(null);
                departmentForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingDepartment ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Audit Log Modal */}
      <Modal
        open={auditModalOpen}
        title="All Audit Logs"
        onClose={() => setAuditModalOpen(false)}
      >
        <div className="max-h-96 overflow-y-auto">
          <Table
            rows={auditLogs}
            loading={auditQuery.loading}
            error={auditQuery.error}
            columns={[
              { key: "audit_log_id", title: "ID" },
              { key: "user_email", title: "User" },
              { key: "action", title: "Action" },
              { key: "resource_type", title: "Resource" },
              { key: "resource_id", title: "Resource ID" },
              { key: "created_at_formatted", title: "Timestamp" },
            ]}
            searchPlaceholder="Search audit logs..."
            pageSize={20}
            pageSizeOptions={[20, 50, 100]}
          />
        </div>
      </Modal>

      {/* Assign Teacher To Class Modal */}
      <Modal
        open={assignClassSubjectModalOpen}
        title="Assign Teacher To Class"
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
            name="teacher_id"
            value={assignClassSubjectForm.values.teacher_id}
            onChange={assignClassSubjectForm.handleChange}
            options={teacherOptions}
            error={assignClassSubjectForm.errors.teacher_id}
            required
          />
          <Select
            label="Class"
            name="class_id"
            value={assignClassSubjectForm.values.class_id}
            onChange={assignClassSubjectForm.handleChange}
            options={classOptions}
            error={assignClassSubjectForm.errors.class_id}
            required
          />
          <Select
            label="Subject"
            name="subject_id"
            value={assignClassSubjectForm.values.subject_id}
            onChange={assignClassSubjectForm.handleChange}
            options={subjectOptions}
            error={assignClassSubjectForm.errors.subject_id}
            required
          />
          <p className="text-xs text-slate-500">
            If the class-subject mapping is missing, it is auto-created before
            assignment.
          </p>
          <div className="flex justify-end gap-2">
            <Button
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

export default AdminDashboard;
