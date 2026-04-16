import { useEnhancedForm } from "../../hooks/useEnhancedForm";
import EnhancedInput from "../common/EnhancedInput";
import EnhancedSelect from "../common/EnhancedSelect";
import Button from "../common/Button";
import FormError from "../common/FormError";
import SuccessFeedback from "../common/SuccessFeedback";

/**
 * Enhanced Marks Form with real-time validation and server error handling
 */
const EnhancedMarksForm = ({
  enrollments = [],
  subjects = [],
  teachers = [],
  onSubmit,
  loading,
}) => {
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
      teacher_id: "",
      enrollment_id: "",
      subject_id: "",
      mark_obtained: "",
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
        message="Mark submitted successfully!" 
        show={submitSuccess} 
        onClose={clearSuccess}
      />

      <div className="grid gap-3 md:grid-cols-5">
        <EnhancedSelect
          label="Teacher"
          options={teachers.map((t) => ({
            value: t.teacher_id,
            label: t.full_name,
          }))}
          error={getFieldError('teacher_id')}
          required
          {...register('teacher_id', {
            required: 'Teacher is required',
            onChange: () => clearServerError('teacher_id')
          })}
        />

        <EnhancedSelect
          label="Enrollment"
          options={enrollments.map((e) => ({
            value: e.enrollment_id,
            label: `Enrollment #${e.enrollment_id}`,
          }))}
          error={getFieldError('enrollment_id')}
          required
          {...register('enrollment_id', {
            required: 'Enrollment is required',
            onChange: () => clearServerError('enrollment_id')
          })}
        />

        <EnhancedSelect
          label="Subject"
          options={subjects.map((s) => ({ 
            value: s.subject_id, 
            label: s.name 
          }))}
          error={getFieldError('subject_id')}
          required
          {...register('subject_id', {
            required: 'Subject is required',
            onChange: () => clearServerError('subject_id')
          })}
        />

        <EnhancedInput
          label="Mark"
          type="number"
          error={getFieldError('mark_obtained')}
          required
          {...register('mark_obtained', {
            required: 'Mark is required',
            min: {
              value: 0,
              message: 'Mark must be at least 0'
            },
            max: {
              value: 100,
              message: 'Mark must not exceed 100'
            },
            onChange: () => clearServerError('mark_obtained')
          })}
        />

        <div className="flex items-end">
          <Button type="submit" loading={loading}>
            Submit Mark
          </Button>
        </div>
      </div>
    </form>
  );
};

export default EnhancedMarksForm;
