import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useForm } from "../../hooks/useForm";
import { validateForm } from "../../utils/validateForm";
import Input from "../common/Input";
import Button from "../common/Button";

const LoginForm = () => {
  const { login, authLoading } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: { email: "", password: "" },
    validate: (values) => validateForm("login", values),
    onSubmit: async (values) => {
      await login(values);
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
        name="password"
        type="password"
        value={form.values.password}
        onChange={form.handleChange}
        error={form.errors.password}
        required
      />
      <Button
        type="submit"
        loading={authLoading}
        loadingText="Signing In..."
        className="w-full"
      >
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;
