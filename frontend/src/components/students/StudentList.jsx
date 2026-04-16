import Table from "../common/Table";
import Loader from "../common/Loader";

const StudentList = ({
  students = [],
  loading = false,
  error = "",
  onEdit,
  onDelete,
  actionLoading = false,
  activeStudentId = null,
}) => {
  if (loading) return <Loader text="Loading students..." />;

  const showActions =
    typeof onEdit === "function" || typeof onDelete === "function";

  const columns = [
    {
      key: "studentId",
      title: "ID",
      render: (row) => row.studentId || row.student_id || "-",
    },
    {
      key: "studentSchoolId",
      title: "School ID",
      render: (row) => row.studentSchoolId || row.student_school_id || "-",
    },
    {
      key: "fullName",
      title: "Name",
      render: (row) => row.fullName || row.full_name || "-",
    },
    { key: "gender", title: "Gender" },
    {
      key: "classDisplay",
      title: "Class",
      render: (row) => row.classDisplay || row.class_display || "-",
    },
    {
      key: "academicYear",
      title: "Academic Year",
      render: (row) => row.academicYear || row.academic_year || "-",
    },
    {
      key: "section",
      title: "Section",
      render: (row) => row.section || "-",
    },
  ];

  if (showActions) {
    columns.push({
      key: "actions",
      title: "Actions",
      sortable: false,
      render: (row) => {
        const studentId = row.studentId || row.student_id;
        const isBusy =
          actionLoading && String(activeStudentId) === String(studentId);

        return (
          <div className="flex items-center gap-2">
            {typeof onEdit === "function" ? (
              <button
                type="button"
                onClick={() => onEdit(row)}
                disabled={isBusy}
                className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Edit
              </button>
            ) : null}
            {typeof onDelete === "function" ? (
              <button
                type="button"
                onClick={() => onDelete(row)}
                disabled={isBusy}
                className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            ) : null}
          </div>
        );
      },
    });
  }

  return <Table rows={students} error={error} columns={columns} />;
};

export default StudentList;
