import { useForm } from "../../hooks/useForm";
import Select from "../common/Select";
import Button from "../common/Button";

const parseAcademicYearStart = (academicYear) => {
  const match = String(academicYear ?? "").match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : NaN;
};

const extractSection = (grade, className) => {
  const normalizedClassName = String(className ?? "")
    .trim()
    .toUpperCase();
  const normalizedGrade = String(grade ?? "")
    .trim()
    .toUpperCase();

  if (normalizedGrade && normalizedClassName.startsWith(normalizedGrade)) {
    return normalizedClassName
      .slice(normalizedGrade.length)
      .replace(/[^A-Z]/g, "");
  }

  const fallback = normalizedClassName.match(/([A-Z]+)$/);
  return fallback ? fallback[1] : "";
};

const normalizeClass = (row = {}) => ({
  classId: row.classId ?? row.class_id,
  className: row.className ?? row.class_name ?? "",
  grade: String(row.grade ?? "").trim(),
  termId: row.termId ?? row.term_id ?? row.term?.termId ?? row.term?.term_id,
  term: {
    termId: row.term?.termId ?? row.term?.term_id ?? row.termId ?? row.term_id,
    academicYear: row.term?.academicYear ?? row.term?.academic_year ?? "",
    semester: row.term?.semester ?? "",
  },
});

const normalizeTerm = (row = {}) => ({
  termId: row.termId ?? row.term_id,
  academicYear: row.academicYear ?? row.academic_year ?? "",
  semester: row.semester ?? "",
});

const PromotionForm = ({ classes = [], terms = [], onSubmit, loading }) => {
  const normalizedClasses = classes.map(normalizeClass);
  const normalizedTerms = terms.map(normalizeTerm);

  const form = useForm({
    initialValues: {
      currentClassId: "",
      nextClassId: "",
      nextTermId: "",
    },
    validate: (values) => {
      const errors = {};
      if (!values.currentClassId) {
        errors.currentClassId = "Current class is required";
      }
      if (!values.nextClassId) {
        errors.nextClassId = "Next class is required";
      }
      if (!values.nextTermId) {
        errors.nextTermId = "Next term is required";
      }
      if (values.currentClassId === values.nextClassId) {
        errors.nextClassId = "Next class must be different from current class";
      }
      return errors;
    },
    onSubmit,
  });

  const selectedCurrentClass = normalizedClasses.find(
    (row) => String(row.classId) === String(form.values.currentClassId),
  );

  const selectedCurrentTerm = selectedCurrentClass
    ? normalizedTerms.find(
        (term) => String(term.termId) === String(selectedCurrentClass.termId),
      ) || selectedCurrentClass.term
    : null;

  const nextTermCandidates = selectedCurrentClass
    ? normalizedTerms.filter((term) => {
        const currentSemester = String(
          selectedCurrentTerm?.semester || "",
        ).toUpperCase();
        const currentYearStart = parseAcademicYearStart(
          selectedCurrentTerm?.academicYear,
        );
        const nextYearStart = parseAcademicYearStart(term.academicYear);

        if (currentSemester === "I") {
          return (
            String(term.semester).toUpperCase() === "II" &&
            term.academicYear === selectedCurrentTerm?.academicYear
          );
        }

        if (currentSemester === "II") {
          return (
            String(term.semester).toUpperCase() === "I" &&
            (!Number.isFinite(currentYearStart) ||
              !Number.isFinite(nextYearStart) ||
              nextYearStart === currentYearStart + 1)
          );
        }

        return false;
      })
    : [];

  const selectedNextTerm = nextTermCandidates.find(
    (term) => String(term.termId) === String(form.values.nextTermId),
  );

  const nextClassCandidates =
    selectedCurrentClass && selectedNextTerm
      ? normalizedClasses.filter((candidate) => {
          const sameTerm =
            String(candidate.termId) === String(selectedNextTerm.termId);
          if (!sameTerm) return false;

          const currentSemester = String(
            selectedCurrentTerm?.semester || "",
          ).toUpperCase();
          const currentGrade = parseInt(selectedCurrentClass.grade, 10);
          const candidateGrade = parseInt(candidate.grade, 10);
          const currentSection = extractSection(
            selectedCurrentClass.grade,
            selectedCurrentClass.className,
          );
          const candidateSection = extractSection(
            candidate.grade,
            candidate.className,
          );

          if (currentSemester === "I") {
            return (
              candidateGrade === currentGrade &&
              (!currentSection ||
                !candidateSection ||
                currentSection === candidateSection)
            );
          }

          if (currentSemester === "II") {
            return (
              candidateGrade === currentGrade + 1 &&
              (!currentSection ||
                !candidateSection ||
                currentSection === candidateSection)
            );
          }

          return false;
        })
      : [];

  const handleCurrentClassChange = (event) => {
    const currentClassId = event.target.value;
    form.setValues((prev) => ({
      ...prev,
      currentClassId,
      nextTermId: "",
      nextClassId: "",
    }));
  };

  const handleNextTermChange = (event) => {
    const nextTermId = event.target.value;
    form.setValues((prev) => ({
      ...prev,
      nextTermId,
      nextClassId: "",
    }));
  };

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Current Class"
          name="currentClassId"
          value={form.values.currentClassId}
          onChange={handleCurrentClassChange}
          options={normalizedClasses.map((c) => ({
            value: c.classId,
            label: `${c.className} (Grade ${c.grade}) - ${c.term.academicYear} Term ${c.term.semester}`,
          }))}
          error={form.errors.currentClassId}
          required
        />
        <Select
          label="Next Term"
          name="nextTermId"
          value={form.values.nextTermId}
          onChange={handleNextTermChange}
          options={nextTermCandidates.map((t) => ({
            value: t.termId,
            label: `${t.academicYear} - Term ${t.semester}`,
          }))}
          error={form.errors.nextTermId}
          disabled={!selectedCurrentClass}
          required
        />
        <Select
          label="Next Class"
          name="nextClassId"
          value={form.values.nextClassId}
          onChange={form.handleChange}
          options={nextClassCandidates.map((c) => ({
            value: c.classId,
            label: `${c.className} (Grade ${c.grade})`,
          }))}
          error={form.errors.nextClassId}
          disabled={!selectedCurrentClass || !selectedNextTerm}
          required
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
        <p className="text-sm text-blue-800">
          <strong>Promotion Rules:</strong>
        </p>
        <p className="text-xs text-blue-700">
          1. Term I class can only move to the same grade and same section in
          Term II of the same academic year.
        </p>
        <p className="text-xs text-blue-700">
          2. Term II class can only move to next grade with same section in Term
          I of the next academic year.
        </p>
        {selectedCurrentClass ? (
          <p className="text-xs font-semibold text-blue-800">
            Current selection: {selectedCurrentClass.className} (Grade{" "}
            {selectedCurrentClass.grade}) -{" "}
            {selectedCurrentClass.term.academicYear} Term{" "}
            {selectedCurrentClass.term.semester}
          </p>
        ) : null}
        {selectedNextTerm ? (
          <p className="text-xs font-semibold text-blue-800">
            Target term: {selectedNextTerm.academicYear} Term{" "}
            {selectedNextTerm.semester}
          </p>
        ) : null}
        {selectedCurrentClass && !nextTermCandidates.length ? (
          <p className="text-xs text-rose-700">
            No valid next term found for the selected class.
          </p>
        ) : null}
        {selectedNextTerm && !nextClassCandidates.length ? (
          <p className="text-xs text-rose-700">
            No valid next class found under real-world progression rules.
          </p>
        ) : null}
      </div>

      <div className="text-xs text-slate-600">
        Academic history is preserved; promotion creates new enrollments in
        target class/term.
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={loading}
          disabled={!form.values.nextClassId}
        >
          Promote Students
        </Button>
      </div>
    </form>
  );
};

export default PromotionForm;
