import { useForm } from "../../hooks/useForm";
import { validateForm } from "../../utils/validateForm";
import Select from "../common/Select";
import Button from "../common/Button";

const EnrollmentForm = ({ students = [], classes = [], onSubmit, loading }) => {
  const form = useForm({
    initialValues: { studentId: "", classId: "" },
    validate: (values) => validateForm("enrollment", values),
    onSubmit,
  });

  return (
    <form
      onSubmit={form.handleSubmit}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Select
        label="Student"
        name="studentId"
        value={form.values.studentId}
        onChange={form.handleChange}
        options={students.map((s) => ({
          value: s.studentId || s.student_id,
          label:
            s.fullName ||
            s.full_name ||
            s.studentSchoolId ||
            s.student_school_id,
        }))}
        error={form.errors.studentId}
      />
      <Select
        label="Class"
        name="classId"
        value={form.values.classId}
        onChange={form.handleChange}
        options={classes.map((c) => ({
          value: c.classId || c.class_id,
          label:
            `${c.grade || "Class"} - ${c.className || c.class_name || "Section"} (${c.term?.academicYear || c.term?.academic_year || "Year"} ${c.term?.semester || ""})`.trim(),
        }))}
        error={form.errors.classId}
      />
      <div className="flex items-end">
        <Button type="submit" loading={loading} className="w-full">
          Assign Student to Class
        </Button>
      </div>
    </form>
  );
};

export default EnrollmentForm;
