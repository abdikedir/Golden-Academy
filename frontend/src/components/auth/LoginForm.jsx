import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useForm } from "../../hooks/useForm";
import { validateForm } from "../../utils/validateForm";
import Input from "../common/Input";
import Button from "../common/Button";

const LoginForm = () => {
  const { login, authLoading } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: { email: "admin@golden.edu", password: "Admin123@" },
    validate: (values) => validateForm("login", values),
    onSubmit: async (values) => {
      await login(values);
      navigate("/dashboard");
    },
  });

  // Auto sign in on load
  useEffect(() => {
    const handleAutoLogin = async () => {
      if (!authLoading) {
        try {
          await login({ email: "admin@golden.edu", password: "Admin123@" });
          navigate("/dashboard");
        } catch (error) {
          console.error("Auto login failed", error);
        }
      }
    };
    handleAutoLogin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
