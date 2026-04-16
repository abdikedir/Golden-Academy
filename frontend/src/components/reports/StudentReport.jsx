import Table from "../common/Table";

const StudentReport = ({ rows = [], loading = false, error = "" }) => {
  return (
    <Table
      rows={rows}
      loading={loading}
      error={error}
      columns={[
        { key: "student_school_id", title: "Student ID" },
        { key: "full_name", title: "Student" },
        { key: "class_name", title: "Class" },
        { key: "total_marks", title: "Total" },
        { key: "average_score", title: "Average" },
        { key: "rank", title: "Rank" },
        { key: "status", title: "Status" },
      ]}
    />
  );
};

export default StudentReport;
