import { useForm } from "../../hooks/useForm";
import { validateForm } from "../../utils/validateForm";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";

const StudentForm = ({ initialValues, onSubmit, loading }) => {
  const form = useForm({
    initialValues,
    validate: (values) => validateForm("student", values),
    onSubmit,
  });

  return (
    <form onSubmit={form.handleSubmit} className="grid gap-3 md:grid-cols-2">
      <Input
        label="Full Name"
        name="fullName"
        value={form.values.fullName}
        onChange={form.handleChange}
        error={form.errors.fullName}
        required
      />
      <Select
        label="Gender"
        name="gender"
        value={form.values.gender}
        onChange={form.handleChange}
        options={[
          { value: "M", label: "Male" },
          { value: "F", label: "Female" },
        ]}
        error={form.errors.gender}
        required
      />
      <div className="md:col-span-2">
        <Button type="submit" loading={loading}>
          Save Student
        </Button>
      </div>
    </form>
  );
};

export default StudentForm;
