import { useEnhancedForm } from "../../hooks/useEnhancedForm";
import EnhancedInput from "../common/EnhancedInput";
import EnhancedSelect from "../common/EnhancedSelect";
import Button from "../common/Button";
import FormError from "../common/FormError";
import SuccessFeedback from "../common/SuccessFeedback";

/**
 * Enhanced Student Form with real-time validation and server error handling
 */
const EnhancedStudentForm = ({ initialValues = {}, onSubmit, loading }) => {
  const {
    register,
    handleSubmit,
    getFieldError,
    clearServerError,
    formError,
    clearAllServerErrors,
    submitSuccess,
    clearSuccess,
    reset
  } = useEnhancedForm({
    defaultValues: {
      student_school_id: initialValues.student_school_id || "",
      full_name: initialValues.full_name || "",
      gender: initialValues.gender || "",
    },
    onSubmit: async (values) => {
      await onSubmit(values);
      reset(); // Reset form after successful submission
    },
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form-level error */}
      <FormError error={formError} onClose={clearAllServerErrors} />
      
      {/* Success feedback */}
      <SuccessFeedback 
        message="Student saved successfully!" 
        show={submitSuccess} 
        onClose={clearSuccess}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <EnhancedInput
          label="School ID"
          error={getFieldError('student_school_id')}
          required
          {...register('student_school_id', {
            required: 'School ID is required',
            onChange: () => clearServerError('student_school_id')
          })}
        />

        <EnhancedInput
          label="Full Name"
          error={getFieldError('full_name')}
          required
          {...register('full_name', {
            required: 'Full name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters'
            },
            onChange: () => clearServerError('full_name')
          })}
        />

        <EnhancedSelect
          label="Gender"
          options={[
            { value: "M", label: "Male" },
            { value: "F", label: "Female" },
          ]}
          error={getFieldError('gender')}
          required
          {...register('gender', {
            required: 'Gender is required',
            onChange: () => clearServerError('gender')
          })}
        />
      </div>

      <div className="md:col-span-3">
        <Button type="submit" loading={loading}>
          Save Student
        </Button>
      </div>
    </form>
  );
};

export default EnhancedStudentForm;
