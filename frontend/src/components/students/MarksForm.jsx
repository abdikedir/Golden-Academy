import { useMemo } from "react";
import { useForm } from "../../hooks/useForm";
import { validateForm } from "../../utils/validateForm";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";

const MarksForm = ({
  enrollments = [],
  subjects = [],
  teachers = [],
  onSubmit,
  loading,
}) => {
  const form = useForm({
    initialValues: {
      student_id: "",
      teacher_id: "",
      enrollment_id: "",
      subject_id: "",
      mark_obtained: "",
    },
    validate: (values) => {
      const errors = validateForm("mark", values);

      if (values.enrollment_id && values.student_id) {
        const selectedEnrollment = (enrollments || []).find(
          (enrollment) =>
            String(enrollment.enrollment_id ?? enrollment.enrollmentId) ===
            String(values.enrollment_id),
        );

        const enrollmentStudentId =
          selectedEnrollment?.student_id ??
          selectedEnrollment?.studentId ??
          selectedEnrollment?.student?.student_id ??
          selectedEnrollment?.student?.studentId;

        if (
          selectedEnrollment &&
          String(enrollmentStudentId) !== String(values.student_id)
        ) {
          errors.enrollment_id =
            "Selected enrollment does not belong to selected student";
        }
      }

      return errors;
    },
    onSubmit,
  });

  const studentOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    (enrollments || []).forEach((enrollment) => {
      const studentId =
        enrollment.student_id ||
        enrollment.studentId ||
        enrollment.student?.student_id ||
        enrollment.student?.studentId;

      if (!studentId || seen.has(String(studentId))) return;
      seen.add(String(studentId));

      const studentName =
        enrollment.student?.full_name ||
        enrollment.student?.fullName ||
        "Student";
      const studentSchoolId =
        enrollment.student?.student_school_id ||
        enrollment.student?.studentSchoolId ||
        "-";

      options.push({
        value: studentId,
        label: `${studentSchoolId} - ${studentName}`,
      });
    });

    return options;
  }, [enrollments]);

  const enrollmentOptions = useMemo(
    () =>
      (enrollments || [])
        .filter((enrollment) => {
          if (!form.values.student_id) return false;

          const studentId =
            enrollment.student_id ||
            enrollment.studentId ||
            enrollment.student?.student_id ||
            enrollment.student?.studentId;

          return String(studentId) === String(form.values.student_id);
        })
        .map((enrollment) => ({
          value: enrollment.enrollment_id ?? enrollment.enrollmentId,
          label: `${enrollment.class?.grade || "Class"} - ${enrollment.class?.class_name || enrollment.class?.className || "Section"} (${enrollment.class?.term?.academic_year || enrollment.class?.term?.academicYear || ""} ${enrollment.class?.term?.semester || ""})`,
        })),
    [enrollments, form.values.student_id],
  );

  const teacherOptions = useMemo(
    () =>
      (teachers || []).map((teacher) => ({
        value: teacher.teacher_id,
        label: teacher.full_name,
      })),
    [teachers],
  );

  const subjectOptions = useMemo(
    () =>
      (subjects || []).map((subject) => ({
        value: subject.subject_id,
        label: subject.name,
      })),
    [subjects],
  );

  const handleStudentChange = (event) => {
    const nextStudentId = event.target.value;
    form.setValues((prev) => ({
      ...prev,
      student_id: nextStudentId,
      enrollment_id: "",
    }));
  };

  return (
    <form onSubmit={form.handleSubmit} className="grid gap-3 md:grid-cols-6">
      <Select
        label="Student"
        name="student_id"
        value={form.values.student_id}
        onChange={handleStudentChange}
        options={studentOptions}
        error={form.errors.student_id}
      />

      <Select
        label="Enrollment"
        name="enrollment_id"
        value={form.values.enrollment_id}
        onChange={form.handleChange}
        options={enrollmentOptions}
        error={form.errors.enrollment_id}
        disabled={!form.values.student_id}
      />

      <Select
        label="Teacher"
        name="teacher_id"
        value={form.values.teacher_id}
        onChange={form.handleChange}
        options={teacherOptions}
        error={form.errors.teacher_id}
      />

      <Select
        label="Subject"
        name="subject_id"
        value={form.values.subject_id}
        onChange={form.handleChange}
        options={subjectOptions}
        error={form.errors.subject_id}
      />

      <Input
        label="Mark"
        name="mark_obtained"
        type="number"
        value={form.values.mark_obtained}
        onChange={form.handleChange}
        error={form.errors.mark_obtained}
      />
      <div className="flex items-end">
        <Button type="submit" loading={loading} className="w-full">
          Submit Mark
        </Button>
      </div>
    </form>
  );
};

export default MarksForm;
