import { useMemo, useState } from "react";
import termApi from "../api/termApi";
import PageLayout from "../components/layout/PageLayout";
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

const TermsPage = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [deletingTerm, setDeletingTerm] = useState(null);
  const [editValues, setEditValues] = useState({
    academic_year: "",
    semester: "",
  });
  const termQuery = useFetch(() => termApi.getAll(), []);

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role).toUpperCase())
    : [];
  const canCrudTerms = normalizedRoles.some((role) =>
    ["SYSTEM_ADMIN", "REGISTRAR"].includes(role),
  );

  const academicYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const generatedYears = Array.from({ length: 6 }, (_, index) => {
      const startYear = currentYear - 2 + index;
      return `${startYear}-${startYear + 1}`;
    });

    const existingYears = (termQuery.data || [])
      .map((term) => term.academic_year || term.academicYear)
      .filter(Boolean);

    const uniqueYears = Array.from(
      new Set([...existingYears, ...generatedYears]),
    );

    const getSortKey = (academicYear) => {
      const match = String(academicYear).match(/^(\d{4})/);
      return match ? Number(match[1]) : 0;
    };

    return uniqueYears
      .sort((a, b) => getSortKey(b) - getSortKey(a))
      .map((academicYear) => ({ value: academicYear, label: academicYear }));
  }, [termQuery.data]);

  const form = useForm({
    initialValues: { academic_year: "", semester: "" },
    validate: (values) => validateForm("term", values),
    onSubmit: async (values) => {
      setSaving(true);
      try {
        await termApi.create(values);
        notify({ type: "success", message: "Term created" });
        form.reset();
        await termQuery.refetch();
      } catch (error) {
        notify({
          type: "error",
          message:
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Failed to create term",
        });
      } finally {
        setSaving(false);
      }
    },
  });

  const openEditTerm = (term) => {
    const termId = term.term_id ?? term.termId;
    const academicYear = term.academic_year ?? term.academicYear ?? "";
    const semester = term.semester ?? "";

    setEditingTerm({ term_id: termId });
    setEditValues({
      academic_year: String(academicYear),
      semester: String(semester),
    });
  };

  const handleUpdateTerm = async (event) => {
    event.preventDefault();
    if (!editingTerm?.term_id) return;

    if (!editValues.academic_year || !editValues.semester) {
      notify({
        type: "error",
        message: "Academic year and semester are required",
      });
      return;
    }

    setSaving(true);
    try {
      await termApi.update(editingTerm.term_id, {
        academicYear: editValues.academic_year,
        semester: editValues.semester,
      });
      notify({ type: "success", message: "Term updated" });
      setEditingTerm(null);
      await termQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to update term"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async () => {
    if (!deletingTerm?.term_id) return;

    setSaving(true);
    try {
      await termApi.remove(deletingTerm.term_id);
      notify({ type: "success", message: "Term deleted" });
      setDeletingTerm(null);
      if (editingTerm?.term_id === deletingTerm.term_id) {
        setEditingTerm(null);
      }
      await termQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete term"),
      });
    } finally {
      setSaving(false);
    }
  };

  const termColumns = [
    { key: "term_id", title: "ID" },
    { key: "academic_year", title: "Academic Year" },
    { key: "semester", title: "Semester" },
  ];

  if (canCrudTerms) {
    termColumns.push({
      key: "actions",
      title: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditTerm(row)}
            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() =>
              setDeletingTerm({
                term_id: row.term_id ?? row.termId,
                label: `${row.academic_year ?? row.academicYear} / ${row.semester}`,
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
    <PageLayout title="Terms">
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Create Term</h3>
        <form
          onSubmit={form.handleSubmit}
          className="grid gap-3 md:grid-cols-3"
        >
          <Select
            label="Academic Year"
            name="academic_year"
            value={form.values.academic_year}
            onChange={form.handleChange}
            options={academicYearOptions}
            error={form.errors.academic_year}
          />
          <Select
            label="Semester"
            name="semester"
            value={form.values.semester}
            onChange={form.handleChange}
            options={[
              { value: "I", label: "I" },
              { value: "II", label: "II" },
            ]}
            error={form.errors.semester}
          />
          <div className="flex items-end">
            <Button type="submit" loading={saving}>
              Save Term
            </Button>
          </div>
        </form>
      </div>

      <TableSection title="Term List">
        <Table
          rows={termQuery.data}
          loading={termQuery.loading}
          error={termQuery.error}
          columns={termColumns}
        />
      </TableSection>

      <Modal
        open={Boolean(editingTerm)}
        title="Update Term"
        onClose={() => !saving && setEditingTerm(null)}
      >
        <form onSubmit={handleUpdateTerm} className="grid gap-3 md:grid-cols-2">
          <Select
            label="Academic Year"
            name="academic_year"
            value={editValues.academic_year}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                academic_year: event.target.value,
              }))
            }
            options={academicYearOptions}
          />
          <Select
            label="Semester"
            name="semester"
            value={editValues.semester}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                semester: event.target.value,
              }))
            }
            options={[
              { value: "I", label: "I" },
              { value: "II", label: "II" },
            ]}
          />
          <div className="md:col-span-2">
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmModal
        open={Boolean(deletingTerm)}
        title="Delete term?"
        description={`This will remove ${deletingTerm?.label || "this term"}.`}
        confirmText="Delete Term"
        loading={saving}
        onCancel={() => !saving && setDeletingTerm(null)}
        onConfirm={handleDeleteTerm}
      />
    </PageLayout>
  );
};

export default TermsPage;
