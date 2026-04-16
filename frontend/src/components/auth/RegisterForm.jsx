import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useForm } from "../../hooks/useForm";
import { validateForm } from "../../utils/validateForm";
import Input from "../common/Input";
import Select from "../common/Select";
import Button from "../common/Button";

const roleOptions = [
  { label: "System Admin", value: "SYSTEM_ADMIN" },
  { label: "Department Admin", value: "DEPARTMENT_ADMIN" },
  { label: "Registrar", value: "REGISTRAR" },
  { label: "Teacher", value: "TEACHER" },
];

const RegisterForm = () => {
  const { register, authLoading } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      roleName: "TEACHER",
    },
    validate: (values) => validateForm("register", values),
    onSubmit: async (values) => {
      await register(values);
      navigate("/dashboard");
    },
  });

  return (
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <Input
        label="Email"
        name="email"
        value={form.values.email}
        onChange={form.handleChange}
        error={form.errors.email}
        required
      />
      <Input
        label="Password"
        type="password"
        name="password"
        value={form.values.password}
        onChange={form.handleChange}
        error={form.errors.password}
        required
      />
      <Select
        label="Role"
        name="roleName"
        value={form.values.roleName}
        onChange={form.handleChange}
        options={roleOptions}
        error={form.errors.roleName}
      />
      <Button
        type="submit"
        loading={authLoading}
        loadingText="Creating Account..."
        className="w-full"
      >
        Create Account
      </Button>
    </form>
  );
};

export default RegisterForm;
