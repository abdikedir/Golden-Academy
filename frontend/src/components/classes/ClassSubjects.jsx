import { useState } from "react";

const ClassSubjects = () => {
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Class Subjects Mapping
          </h3>
          <p className="text-xs text-slate-500">
            Integration is now available for class-subject mapping and teacher
            assignment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNote((prev) => !prev)}
          className="rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
        >
          {showNote ? "Hide Integration Note" : "Show Integration Note"}
        </button>
      </div>

      {showNote ? (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-slate-700">
          <p className="font-semibold text-emerald-800">Integration Note</p>
          <p className="mt-1">
            Use "Assign Teacher to Class" from the Department dashboard. If
            class-subject mapping is missing, the system auto-creates it before
            assigning the teacher.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ClassSubjects;
