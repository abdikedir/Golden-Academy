import { useMemo, useState } from "react";
import auditApi from "../api/auditApi";
import PageLayout from "../components/layout/PageLayout";
import Table from "../components/common/Table";
import TableSection from "../components/common/TableSection";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Modal from "../components/common/Modal";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal";
import { useFetch } from "../hooks/useFetch";
import { extractErrorMessage } from "../api/responseAdapter";
import { notify } from "../utils/notifications";

const AuditLogsPage = () => {
  const [saving, setSaving] = useState(false);
  const [createValues, setCreateValues] = useState({
    action: "",
    resourceType: "",
    resourceId: "",
    metadata: "",
  });
  const [editingLog, setEditingLog] = useState(null);
  const [editValues, setEditValues] = useState({
    action: "",
    resourceType: "",
    resourceId: "",
    metadata: "",
  });
  const [deletingLog, setDeletingLog] = useState(null);

  const auditQuery = useFetch(
    () => auditApi.getAll({ page: 1, limit: 200 }),
    [],
    true,
    { mode: "payload", initialData: { logs: [] } },
  );

  const logs = useMemo(
    () =>
      (auditQuery.data?.logs || []).map((log) => {
        const createdAt = log.created_at || log.createdAt;
        const resourceId = log.resource_id ?? log.resourceId;
        return {
          ...log,
          audit_log_id: log.audit_log_id || log.auditLogId,
          user_email: log.user?.email || "-",
          created_at_label: createdAt
            ? new Date(createdAt).toLocaleString()
            : "-",
          resource_id_label: resourceId ?? "-",
        };
      }),
    [auditQuery.data],
  );

  const parseMetadata = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Metadata must be a JSON object");
      }
      return parsed;
    } catch (_error) {
      throw new Error("Metadata must be valid JSON object");
    }
  };

  const handleCreateLog = async (event) => {
    event.preventDefault();
    if (!createValues.action.trim() || !createValues.resourceType.trim()) {
      notify({
        type: "error",
        message: "Action and resource type are required",
      });
      return;
    }

    let metadata;
    try {
      metadata = parseMetadata(createValues.metadata);
    } catch (error) {
      notify({ type: "error", message: error.message });
      return;
    }

    setSaving(true);
    try {
      await auditApi.create({
        action: createValues.action.trim(),
        resourceType: createValues.resourceType.trim(),
        resourceId: createValues.resourceId
          ? Number(createValues.resourceId)
          : null,
        metadata,
      });
      notify({ type: "success", message: "Audit log created" });
      setCreateValues({
        action: "",
        resourceType: "",
        resourceId: "",
        metadata: "",
      });
      await auditQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to create audit log"),
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditLog = (row) => {
    const metadata = row.metadata || {};
    setEditingLog({
      audit_log_id: row.audit_log_id || row.auditLogId,
      label: `${row.action || "ACTION"} / ${row.resource_type || row.resourceType || "RESOURCE"}`,
    });
    setEditValues({
      action: row.action || "",
      resourceType: row.resource_type || row.resourceType || "",
      resourceId: String(row.resource_id ?? row.resourceId ?? ""),
      metadata: JSON.stringify(metadata, null, 2),
    });
  };

  const handleUpdateLog = async (event) => {
    event.preventDefault();
    if (!editingLog?.audit_log_id) return;

    if (!editValues.action.trim() || !editValues.resourceType.trim()) {
      notify({
        type: "error",
        message: "Action and resource type are required",
      });
      return;
    }

    let metadata;
    try {
      metadata = parseMetadata(editValues.metadata);
    } catch (error) {
      notify({ type: "error", message: error.message });
      return;
    }

    setSaving(true);
    try {
      await auditApi.update(editingLog.audit_log_id, {
        action: editValues.action.trim(),
        resourceType: editValues.resourceType.trim(),
        resourceId: editValues.resourceId
          ? Number(editValues.resourceId)
          : null,
        metadata,
      });
      notify({ type: "success", message: "Audit log updated" });
      setEditingLog(null);
      await auditQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to update audit log"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!deletingLog?.audit_log_id) return;

    setSaving(true);
    try {
      await auditApi.remove(deletingLog.audit_log_id);
      notify({ type: "success", message: "Audit log deleted" });
      setDeletingLog(null);
      if (editingLog?.audit_log_id === deletingLog.audit_log_id) {
        setEditingLog(null);
      }
      await auditQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete audit log"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="Audit Logs">
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Create Audit Log (Admin)</h3>
        <form onSubmit={handleCreateLog} className="grid gap-3 md:grid-cols-3">
          <Input
            label="Action"
            name="action"
            value={createValues.action}
            onChange={(event) =>
              setCreateValues((prev) => ({
                ...prev,
                action: event.target.value,
              }))
            }
            required
          />
          <Input
            label="Resource Type"
            name="resourceType"
            value={createValues.resourceType}
            onChange={(event) =>
              setCreateValues((prev) => ({
                ...prev,
                resourceType: event.target.value,
              }))
            }
            required
          />
          <Input
            label="Resource ID"
            name="resourceId"
            type="number"
            value={createValues.resourceId}
            onChange={(event) =>
              setCreateValues((prev) => ({
                ...prev,
                resourceId: event.target.value,
              }))
            }
          />
          <div className="md:col-span-3 space-y-1">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="create-audit-metadata"
            >
              Metadata (JSON)
            </label>
            <textarea
              id="create-audit-metadata"
              value={createValues.metadata}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  metadata: event.target.value,
                }))
              }
              placeholder='{"source":"admin-dashboard"}'
              className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" loading={saving}>
              Create Audit Log
            </Button>
          </div>
        </form>
      </div>

      <TableSection title="Audit Log Entries">
        <Table
          rows={logs}
          loading={auditQuery.loading}
          error={auditQuery.error}
          columns={[
            { key: "audit_log_id", title: "ID" },
            { key: "action", title: "Action" },
            {
              key: "resource_type",
              title: "Resource",
              render: (row) => row.resource_type || row.resourceType || "-",
            },
            {
              key: "resource_id_label",
              title: "Resource ID",
            },
            { key: "user_email", title: "User" },
            {
              key: "created_at_label",
              title: "Created At",
            },
            {
              key: "actions",
              title: "Actions",
              sortable: false,
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditLog(row)}
                    className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeletingLog({
                        audit_log_id: row.audit_log_id || row.auditLogId,
                        label: `${row.action || "ACTION"} / ${row.resource_type || row.resourceType || "RESOURCE"}`,
                      })
                    }
                    className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      </TableSection>

      <Modal
        open={Boolean(editingLog)}
        title="Update Audit Log"
        onClose={() => !saving && setEditingLog(null)}
      >
        <form onSubmit={handleUpdateLog} className="grid gap-3 md:grid-cols-2">
          <Input
            label="Action"
            name="action"
            value={editValues.action}
            onChange={(event) =>
              setEditValues((prev) => ({ ...prev, action: event.target.value }))
            }
            required
          />
          <Input
            label="Resource Type"
            name="resourceType"
            value={editValues.resourceType}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                resourceType: event.target.value,
              }))
            }
            required
          />
          <Input
            label="Resource ID"
            name="resourceId"
            type="number"
            value={editValues.resourceId}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                resourceId: event.target.value,
              }))
            }
          />
          <div className="md:col-span-2 space-y-1">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="edit-audit-metadata"
            >
              Metadata (JSON)
            </label>
            <textarea
              id="edit-audit-metadata"
              value={editValues.metadata}
              onChange={(event) =>
                setEditValues((prev) => ({
                  ...prev,
                  metadata: event.target.value,
                }))
              }
              className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        open={Boolean(deletingLog)}
        title="Delete audit log?"
        description={`This will remove ${deletingLog?.label || "this audit log"}.`}
        confirmText="Delete Audit Log"
        loading={saving}
        onCancel={() => !saving && setDeletingLog(null)}
        onConfirm={handleDeleteLog}
      />
    </PageLayout>
  );
};

export default AuditLogsPage;
