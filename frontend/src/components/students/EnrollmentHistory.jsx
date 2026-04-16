import { useMemo } from "react";
import Table from "../common/Table";
import Loader from "../common/Loader";
import { formatDate } from "../../utils/formatDate";

const EnrollmentHistory = ({ studentId, history, loading = false }) => {
  const historyRows = useMemo(() => {
    if (!history?.enrollments) return [];
    
    return history.enrollments.map((enrollment) => {
      const term = enrollment.class?.term;
      const marks = enrollment.marks || [];
      const totalMarks = marks.reduce((sum, m) => sum + (m.markObtained || 0), 0);
      const average = marks.length > 0 ? (totalMarks / marks.length).toFixed(2) : "N/A";
      
      return {
        enrollmentId: enrollment.enrollmentId,
        academicYear: term?.academicYear || "N/A",
        semester: term?.semester || "N/A",
        className: enrollment.class?.className || "N/A",
        grade: enrollment.class?.grade || "N/A",
        homeroomTeacher: enrollment.class?.homeroomTeacher?.fullName || "N/A",
        subjectsCount: marks.length,
        average,
        enrolledAt: formatDate(enrollment.enrolledAt),
      };
    });
  }, [history]);

  if (loading) {
    return <Loader text="Loading enrollment history..." />;
  }

  if (!history) {
    return (
      <div className="text-center py-8 text-slate-500">
        Select a student to view their enrollment history
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h4 className="text-sm font-semibold text-slate-800 mb-2">
          Student Information
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-slate-600">Name:</span>{" "}
            <span className="font-medium">{history.student?.fullName}</span>
          </div>
          <div>
            <span className="text-slate-600">School ID:</span>{" "}
            <span className="font-medium">{history.student?.studentSchoolId}</span>
          </div>
        </div>
      </div>

      <Table
        rows={historyRows}
        columns={[
          { key: "academicYear", title: "Academic Year" },
          { key: "semester", title: "Semester" },
          { key: "className", title: "Class" },
          { key: "grade", title: "Grade" },
          { key: "homeroomTeacher", title: "Homeroom Teacher" },
          { key: "subjectsCount", title: "Subjects" },
          { key: "average", title: "Average" },
          { key: "enrolledAt", title: "Enrolled On" },
        ]}
        searchPlaceholder="Search enrollment history..."
        pageSize={10}
      />
    </div>
  );
};

export default EnrollmentHistory;
