import Table from "../common/Table";

const ClassList = ({
  classes = [],
  termLookup = {},
  teacherLookup = {},
  loading = false,
  error = "",
  onEdit,
  onDelete,
}) => {
  const columns = [
    { key: "class_id", title: "ID" },
    { key: "class_name", title: "Class" },
    { key: "grade", title: "Grade" },
    {
      key: "term_id",
      title: "Term",
      render: (row) => termLookup[row.term_id] || row.term_id || "-",
    },
    {
      key: "homeroom_teacher_id",
      title: "Homeroom Teacher",
      render: (row) =>
        teacherLookup[row.homeroom_teacher_id] ||
        row.homeroom_teacher_id ||
        "-",
    },
    {
      key: "results_published",
      title: "Published",
      render: (row) => (row.results_published ? "Yes" : "No"),
    },
  ];

  if (typeof onEdit === "function" || typeof onDelete === "function") {
    columns.push({
      key: "actions",
      title: "Actions",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          {typeof onEdit === "function" ? (
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              Edit
            </button>
          ) : null}
          {typeof onDelete === "function" ? (
            <button
              type="button"
              onClick={() => onDelete(row)}
              className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Delete
            </button>
          ) : null}
        </div>
      ),
    });
  }

  return (
    <Table rows={classes} loading={loading} error={error} columns={columns} />
  );
};

export default ClassList;
