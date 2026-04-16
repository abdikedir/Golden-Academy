import { calculateAverage } from "../../utils/calculateAverage";

const ClassReport = ({ rows = [] }) => {
  const classAverage = calculateAverage(
    rows.map((row) => ({ mark_obtained: row.average_score })),
  );

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="card">
        <p className="text-xs text-slate-500">Total Students</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">
          {rows.length}
        </p>
      </div>
      <div className="card">
        <p className="text-xs text-slate-500">Class Average</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">
          {classAverage}
        </p>
      </div>
      <div className="card">
        <p className="text-xs text-slate-500">Pass Count</p>
        <p className="mt-1 text-xl font-semibold text-emerald-700">
          {rows.filter((r) => r.status === "PASS").length}
        </p>
      </div>
    </div>
  );
};

export default ClassReport;
