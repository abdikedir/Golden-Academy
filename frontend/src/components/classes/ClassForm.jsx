import { useForm } from "../../hooks/useForm";
import { validateForm } from "../../utils/validateForm";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";

const gradeOptions = ["9", "10", "11", "12"].map((grade) => ({
  value: grade,
  label: grade,
}));

const sectionOptions = Array.from({ length: 26 }, (_, index) => {
  const section = String.fromCharCode(65 + index);
  return { value: section, label: section };
});

const buildClassName = (grade, section) => {
  if (!grade || !section) return "";
  return `${grade}${section}`;
};

const ClassForm = ({ terms = [], teachers = [], onSubmit, loading }) => {
  const form = useForm({
    initialValues: {
      class_name: "",
      grade: "",
      section: "",
      term_id: "",
      homeroom_teacher_id: "",
    },
    validate: (values) => validateForm("class", values),
    onSubmit: async (values) => {
      const className = buildClassName(values.grade, values.section);
      await onSubmit({
        ...values,
        section: values.section?.toUpperCase(),
        class_name: className,
      });
    },
  });

  const handleGradeChange = (event) => {
    const nextGrade = event.target.value;
    form.setValues((prev) => ({
      ...prev,
      grade: nextGrade,
      class_name: buildClassName(nextGrade, prev.section),
    }));
  };

  const handleSectionChange = (event) => {
    const nextSection = event.target.value;
    form.setValues((prev) => ({
      ...prev,
      section: nextSection,
      class_name: buildClassName(prev.grade, nextSection),
    }));
  };

  return (
    <form onSubmit={form.handleSubmit} className="grid gap-3 md:grid-cols-6">
      <Input
        label="Class Name (Auto)"
        name="class_name"
        value={form.values.class_name}
        readOnly
        placeholder="Select grade and section"
        error={form.errors.class_name}
      />
      <Select
        label="Grade"
        name="grade"
        value={form.values.grade}
        onChange={handleGradeChange}
        options={gradeOptions}
        error={form.errors.grade}
        required
      />
      <Select
        label="Section"
        name="section"
        value={form.values.section}
        onChange={handleSectionChange}
        options={sectionOptions}
        error={form.errors.section}
        required
      />
      <Select
        label="Term"
        name="term_id"
        value={form.values.term_id}
        onChange={form.handleChange}
        options={terms.map((t) => ({
          value: t.term_id ?? t.termId,
          label: `${t.academic_year ?? t.academicYear} ${t.semester}`,
        }))}
        error={form.errors.term_id}
        required
      />
      <Select
        label="Homeroom Teacher"
        name="homeroom_teacher_id"
        value={form.values.homeroom_teacher_id}
        onChange={form.handleChange}
        options={teachers.map((t) => ({
          value: t.teacher_id ?? t.teacherId,
          label: t.full_name ?? t.fullName,
        }))}
        error={form.errors.homeroom_teacher_id}
        required
      />
      <div className="flex items-end">
        <Button type="submit" loading={loading}>
          Save Class
        </Button>
      </div>
    </form>
  );
};

export default ClassForm;
