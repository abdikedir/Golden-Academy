import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useEnhancedForm } from "../../hooks/useEnhancedForm";
import EnhancedInput from "../common/EnhancedInput";
import Button from "../common/Button";
import FormError from "../common/FormError";
import SuccessFeedback from "../common/SuccessFeedback";

/**
 * Enhanced Login Form with real-time validation and server error handling
 * Demonstrates the new validation system
 */
const EnhancedLoginForm = () => {
  const { login, authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    getFieldError,
    hasFieldError,
    clearServerError,
    formError,
    clearAllServerErrors,
    submitSuccess,
    clearSuccess
  } = useEnhancedForm({
    defaultValues: { email: "admin@golden.edu", password: "Admin123@" },
    onSubmit: async (values) => {
      await login(values);
      navigate("/dashboard");
    },
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form-level error */}
      <FormError error={formError} onClose={clearAllServerErrors} />
      
      {/* Success feedback */}
      <SuccessFeedback 
        message="Login successful!" 
        show={submitSuccess} 
        onClose={clearSuccess}
      />

      <EnhancedInput
        label="Email"
        type="email"
        error={getFieldError('email')}
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Enter a valid email address'
          },
          onChange: () => clearServerError('email')
        })}
      />

      <EnhancedInput
        label="Password"
        type="password"
        error={getFieldError('password')}
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters'
          },
          onChange: () => clearServerError('password')
        })}
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

export default EnhancedLoginForm;
