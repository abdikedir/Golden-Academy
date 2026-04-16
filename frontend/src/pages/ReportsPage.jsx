import { useMemo, useState } from "react";
import reportApi from "../api/reportApi";
import classApi from "../api/classApi";
import { extractErrorMessage } from "../api/responseAdapter";
import PageLayout from "../components/layout/PageLayout";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";
import TableSection from "../components/common/TableSection";
import StudentReport from "../components/reports/StudentReport";
import ClassReport from "../components/reports/ClassReport";
import StateView from "../components/common/StateView";
import { FileDown } from "lucide-react";
import { exportRowsToPdf } from "../utils/exportPdf";
import { notify } from "../utils/notifications";
import { useFetch } from "../hooks/useFetch";

const ReportsPage = () => {
  const [filters, setFilters] = useState({
    class_id: "",
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const classesQuery = useFetch(() => classApi.getAll(), []);

  const classOptions = useMemo(
    () =>
      (classesQuery.data || []).map((classRow) => ({
        value: classRow.class_id,
        label:
          `${classRow.class_name} (${classRow.grade}) - ${classRow.term?.academic_year || classRow.term?.academicYear || ""} ${classRow.term?.semester || ""}`.trim(),
      })),
    [classesQuery.data],
  );

  const selectedClass = useMemo(
    () =>
      (classesQuery.data || []).find(
        (classRow) => String(classRow.class_id) === String(filters.class_id),
      ),
    [classesQuery.data, filters.class_id],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const fetchReport = async () => {
    if (!filters.class_id) {
      const message = "Please select a class to generate report.";
      setError(message);
      notify({ type: "warning", message });
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await reportApi.getAcademicReport({
        classId: Number(filters.class_id),
      });
      const reportData = response?.data?.data || response?.data || [];
      const reportRows = (Array.isArray(reportData) ? reportData : []).map(
        (item) => ({
          student_school_id:
            item.studentSchoolId || item.student_school_id || "-",
          full_name: item.fullName || item.full_name || "-",
          class_name:
            item.className ||
            item.class_name ||
            selectedClass?.class_name ||
            "-",
          academic_year:
            item.academicYear ||
            item.academic_year ||
            selectedClass?.term?.academic_year ||
            selectedClass?.term?.academicYear ||
            "-",
          semester: item.semester || selectedClass?.term?.semester || "-",
          total_marks: item.totalMarks || item.total_marks || 0,
          average_score: item.averageScore || item.average_score || 0,
          rank: item.rank ?? "-",
          status: item.status || "INCOMPLETE",
        }),
      );

      setRows(reportRows);
      notify({ type: "success", message: "Report generated successfully." });
    } catch (err) {
      const message = extractErrorMessage(err, "Unable to generate report.");
      setError(message);
      notify({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const summaryRows = useMemo(() => rows, [rows]);

  const handleExportReport = async () => {
    if (!rows.length) {
      notify({
        type: "warning",
        message: "No report data is available for export.",
      });
      return;
    }

    await exportRowsToPdf({
      fileName: "golden-high-school-academic-report.pdf",
      title: "Golden High School - Academic Report",
      subtitle: `Total records: ${rows.length}`,
      columns: [
        { header: "Student ID", accessor: (row) => row.student_school_id },
        { header: "Student Name", accessor: (row) => row.full_name },
        { header: "Class", accessor: (row) => row.class_name },
        { header: "Academic Year", accessor: (row) => row.academic_year },
        { header: "Semester", accessor: (row) => row.semester },
        {
          header: "Average",
          accessor: (row) => row.average_score ?? row.percentage,
        },
        { header: "Rank", accessor: (row) => row.rank },
        { header: "Status", accessor: (row) => row.status },
      ],
      rows,
    });

    notify({
      type: "success",
      message: "Report data has been exported successfully.",
    });
  };

  return (
    <PageLayout title="Reports">
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold">Filter Report</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            label="Class"
            name="class_id"
            value={filters.class_id}
            onChange={handleChange}
            options={classOptions}
          />
          <Input
            label="Academic Year"
            name="academic_year"
            value={
              selectedClass?.term?.academic_year ||
              selectedClass?.term?.academicYear ||
              ""
            }
            onChange={() => {}}
            readOnly
          />
          <Input
            label="Semester"
            name="semester"
            value={selectedClass?.term?.semester || ""}
            onChange={() => {}}
            readOnly
          />
          <div className="flex items-end">
            <Button
              onClick={fetchReport}
              loading={loading}
              loadingText="Generating Report..."
            >
              Load Report
            </Button>
          </div>
        </div>
      </div>

      {loading ? <StateView type="loading" title="Generating Report" /> : null}
      {!loading && error ? (
        <StateView type="error" description={error} />
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <StateView
          type="empty"
          title="No Report Data Available"
          description="Adjust the filters and load the report again."
        />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <ClassReport rows={summaryRows} />
      ) : null}

      <TableSection
        title="Student Report"
        actions={
          <Button variant="secondary" onClick={handleExportReport}>
            <span className="inline-flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Export PDF
            </span>
          </Button>
        }
      >
        <StudentReport rows={rows} loading={loading} error={error} />
      </TableSection>
    </PageLayout>
  );
};

export default ReportsPage;
