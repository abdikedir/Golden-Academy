import { useMemo, useState } from "react";
import classApi from "../api/classApi";
import termApi from "../api/termApi";
import teacherApi from "../api/teacherApi";
import PageLayout from "../components/layout/PageLayout";
import ClassForm from "../components/classes/ClassForm";
import ClassList from "../components/classes/ClassList";
import ClassSubjects from "../components/classes/ClassSubjects";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import DeleteConfirmModal from "../components/common/DeleteConfirmModal";
import TableSection from "../components/common/TableSection";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../api/responseAdapter";
import { notify } from "../utils/notifications";

const ClassesPage = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);
  const [editValues, setEditValues] = useState({
    class_name: "",
    grade: "",
    section: "",
    term_id: "",
    homeroom_teacher_id: "",
  });
  const [publishFilters, setPublishFilters] = useState({
    academicYear: "",
    semester: "",
    classId: "",
  });

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => String(role).toUpperCase())
    : [];
  const isSystemAdmin = normalizedRoles.includes("SYSTEM_ADMIN");

  const classQuery = useFetch(() => classApi.getAll(), []);
  const termQuery = useFetch(() => termApi.getAll(), []);
  const teacherQuery = useFetch(() => teacherApi.getAll(), []);

  const termLookup = useMemo(
    () =>
      Object.fromEntries(
        (termQuery.data || []).map((term) => [
          term.term_id,
          `${term.academic_year} / ${term.semester}`,
        ]),
      ),
    [termQuery.data],
  );

  const teacherLookup = useMemo(
    () =>
      Object.fromEntries(
        (teacherQuery.data || []).map((teacher) => [
          teacher.teacher_id,
          teacher.full_name,
        ]),
      ),
    [teacherQuery.data],
  );

  const publishAcademicYearOptions = useMemo(() => {
    const years = Array.from(
      new Set(
        (classQuery.data || [])
          .map(
            (row) => row.term?.academic_year || row.term?.academicYear || null,
          )
          .filter(Boolean),
      ),
    ).sort((a, b) => String(b).localeCompare(String(a)));

    return years.map((year) => ({ value: year, label: year }));
  }, [classQuery.data]);

  const publishSemesterOptions = useMemo(() => {
    const semesters = Array.from(
      new Set(
        (classQuery.data || [])
          .filter((row) => {
            const year = row.term?.academic_year || row.term?.academicYear;
            return String(year) === String(publishFilters.academicYear);
          })
          .map((row) => row.term?.semester)
          .filter(Boolean),
      ),
    ).sort();

    return semesters.map((semester) => ({
      value: semester,
      label: `Term ${semester}`,
    }));
  }, [classQuery.data, publishFilters.academicYear]);

  const publishClassOptions = useMemo(
    () =>
      (classQuery.data || [])
        .filter((row) => {
          const year = row.term?.academic_year || row.term?.academicYear;
          const semester = row.term?.semester;
          return (
            String(year) === String(publishFilters.academicYear) &&
            String(semester) === String(publishFilters.semester)
          );
        })
        .map((row) => ({
          value: row.class_id,
          label: `${row.grade || "Grade"} - ${row.class_name || "Class"}`,
        })),
    [classQuery.data, publishFilters.academicYear, publishFilters.semester],
  );

  const handleCreateClass = async (values) => {
    setSaving(true);
    try {
      await classApi.create({
        ...values,
        term_id: Number(values.term_id),
        homeroom_teacher_id: values.homeroom_teacher_id
          ? Number(values.homeroom_teacher_id)
          : null,
      });
      notify({ type: "success", message: "Class created" });
      await classQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: error?.response?.data?.message || "Failed to create class",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!publishFilters.classId) {
      notify({ type: "warning", message: "Please select class to publish." });
      return;
    }

    setSaving(true);
    try {
      await classApi.publishResults(publishFilters.classId);
      notify({ type: "success", message: "Class results published" });
      await classQuery.refetch();
      setPublishFilters({ academicYear: "", semester: "", classId: "" });
    } catch (error) {
      notify({
        type: "error",
        message: error?.response?.data?.message || "Publish failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const buildClassName = (grade, section) => {
    if (!grade || !section) return "";
    return `${String(grade).trim()}${String(section).trim().toUpperCase()}`;
  };

  const openEditClass = (row) => {
    const classId = row.class_id ?? row.classId;
    const grade = String(row.grade ?? "").trim();
    const className = String(row.class_name ?? row.className ?? "").trim();
    const derivedSection = className.startsWith(grade)
      ? className.slice(grade.length)
      : "";

    const section = String(row.section ?? derivedSection ?? "").toUpperCase();
    const termId =
      row.term_id ?? row.termId ?? row.term?.termId ?? row.term?.term_id ?? "";
    const homeroomTeacherId =
      row.homeroom_teacher_id ??
      row.homeroomTeacherId ??
      row.homeroomTeacher?.teacherId ??
      row.homeroom_teacher?.teacher_id ??
      "";

    setEditingClass({ class_id: classId, class_name: className });
    setEditValues({
      class_name: className || buildClassName(grade, section),
      grade,
      section,
      term_id: String(termId || ""),
      homeroom_teacher_id: String(homeroomTeacherId || ""),
    });
  };

  const handleUpdateClass = async (event) => {
    event.preventDefault();
    if (!editingClass?.class_id) return;

    if (!editValues.grade || !editValues.section || !editValues.term_id) {
      notify({
        type: "error",
        message: "Grade, section, and term are required",
      });
      return;
    }

    setSaving(true);
    try {
      await classApi.update(editingClass.class_id, {
        grade: editValues.grade,
        section: editValues.section.toUpperCase(),
        class_name: buildClassName(editValues.grade, editValues.section),
        term_id: Number(editValues.term_id),
        homeroom_teacher_id: editValues.homeroom_teacher_id
          ? Number(editValues.homeroom_teacher_id)
          : null,
      });
      notify({ type: "success", message: "Class updated" });
      setEditingClass(null);
      await classQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to update class"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deletingClass?.class_id) return;

    setSaving(true);
    try {
      await classApi.remove(deletingClass.class_id);
      notify({ type: "success", message: "Class deleted" });
      setDeletingClass(null);
      if (editingClass?.class_id === deletingClass.class_id) {
        setEditingClass(null);
      }
      await classQuery.refetch();
    } catch (error) {
      notify({
        type: "error",
        message: extractErrorMessage(error, "Failed to delete class"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="Classes">
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Create Class</h3>
        <ClassForm
          terms={termQuery.data}
          teachers={teacherQuery.data}
          onSubmit={handleCreateClass}
          loading={saving}
        />
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Publish Class Results</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            label="Academic Year"
            name="publishAcademicYear"
            value={publishFilters.academicYear}
            onChange={(event) =>
              setPublishFilters({
                academicYear: event.target.value,
                semester: "",
                classId: "",
              })
            }
            options={publishAcademicYearOptions}
          />
          <Select
            label="Term"
            name="publishSemester"
            value={publishFilters.semester}
            onChange={(event) =>
              setPublishFilters((prev) => ({
                ...prev,
                semester: event.target.value,
                classId: "",
              }))
            }
            options={publishSemesterOptions}
            disabled={!publishFilters.academicYear}
          />
          <Select
            label="Class"
            name="publishClass"
            value={publishFilters.classId}
            onChange={(event) =>
              setPublishFilters((prev) => ({
                ...prev,
                classId: event.target.value,
              }))
            }
            options={publishClassOptions}
            disabled={!publishFilters.academicYear || !publishFilters.semester}
          />
          <div className="flex items-end">
            <Button
              onClick={handlePublish}
              loading={saving}
              disabled={!publishFilters.classId}
              className="w-full"
            >
              Publish
            </Button>
          </div>
        </div>
      </div>

      <ClassSubjects />

      <TableSection title="Class List">
        <ClassList
          classes={classQuery.data}
          termLookup={termLookup}
          teacherLookup={teacherLookup}
          loading={classQuery.loading}
          error={classQuery.error}
          onEdit={isSystemAdmin ? openEditClass : undefined}
          onDelete={
            isSystemAdmin
              ? (row) =>
                  setDeletingClass({
                    class_id: row.class_id ?? row.classId,
                    class_name: row.class_name ?? row.className,
                  })
              : undefined
          }
        />
      </TableSection>

      <Modal
        open={Boolean(editingClass)}
        title="Update Class"
        onClose={() => !saving && setEditingClass(null)}
      >
        <form
          onSubmit={handleUpdateClass}
          className="grid gap-3 md:grid-cols-2"
        >
          <Input
            label="Class Name (Auto)"
            name="class_name"
            value={buildClassName(editValues.grade, editValues.section)}
            readOnly
          />
          <Select
            label="Grade"
            name="grade"
            value={editValues.grade}
            onChange={(event) =>
              setEditValues((prev) => ({ ...prev, grade: event.target.value }))
            }
            options={["9", "10", "11", "12"].map((grade) => ({
              value: grade,
              label: grade,
            }))}
          />
          <Select
            label="Section"
            name="section"
            value={editValues.section}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                section: event.target.value.toUpperCase(),
              }))
            }
            options={Array.from({ length: 26 }, (_, index) => {
              const section = String.fromCharCode(65 + index);
              return { value: section, label: section };
            })}
          />
          <Select
            label="Term"
            name="term_id"
            value={editValues.term_id}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                term_id: event.target.value,
              }))
            }
            options={(termQuery.data || []).map((term) => ({
              value: term.term_id ?? term.termId,
              label: `${term.academic_year ?? term.academicYear} ${term.semester}`,
            }))}
          />
          <Select
            label="Homeroom Teacher"
            name="homeroom_teacher_id"
            value={editValues.homeroom_teacher_id}
            onChange={(event) =>
              setEditValues((prev) => ({
                ...prev,
                homeroom_teacher_id: event.target.value,
              }))
            }
            options={(teacherQuery.data || []).map((teacher) => ({
              value: teacher.teacher_id ?? teacher.teacherId,
              label: teacher.full_name ?? teacher.fullName,
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
        open={Boolean(deletingClass)}
        title="Delete class?"
        description={`This will remove ${deletingClass?.class_name || "this class"}.`}
        confirmText="Delete Class"
        loading={saving}
        onCancel={() => !saving && setDeletingClass(null)}
        onConfirm={handleDeleteClass}
      />
    </PageLayout>
  );
};

export default ClassesPage;
