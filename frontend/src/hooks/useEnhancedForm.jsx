import { useForm as useReactHookForm } from 'react-hook-form';
import { useState, useCallback } from 'react';

/**
 * Enhanced form hook that integrates react-hook-form with server-side validation
 * Provides real-time validation, server error handling, and success feedback
 */
export const useEnhancedForm = ({ 
  defaultValues = {}, 
  onSubmit,
  mode = 'onBlur' // Validate on blur for better UX
}) => {
  const [serverErrors, setServerErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useReactHookForm({
    defaultValues,
    mode,
    reValidateMode: 'onChange'
  });

  // Clear server error for a specific field when user starts typing
  const clearServerError = useCallback((fieldName) => {
    setServerErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Clear all server errors
  const clearAllServerErrors = useCallback(() => {
    setServerErrors({});
  }, []);

  // Clear success state
  const clearSuccess = useCallback(() => {
    setSubmitSuccess(false);
  }, []);

  // Handle form submission with server error handling
  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setServerErrors({});
    setSubmitSuccess(false);

    try {
      await onSubmit(data);
      setSubmitSuccess(true);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      // Handle server validation errors
      if (error?.response?.status === 400) {
        const errorMessage = error.response.data?.error || error.response.data?.message;
        
        // Try to map error to specific field
        const fieldErrors = parseServerError(errorMessage, data);
        setServerErrors(fieldErrors);
      } else {
        // General error - set as form-level error
        setServerErrors({ 
          _form: error?.response?.data?.error || error?.response?.data?.message || 'An error occurred' 
        });
      }
      // Note: error is captured in serverErrors/formError state above.
      // We do not re-throw here to avoid unhandled rejection warnings in tests
      // and because callers can observe the error via serverErrors/formError.
    } finally {
      setIsSubmitting(false);
    }
  });

  // Get combined errors (client + server)
  const getFieldError = useCallback((fieldName) => {
    return form.formState.errors[fieldName]?.message || serverErrors[fieldName];
  }, [form.formState.errors, serverErrors]);

  // Check if field has any error
  const hasFieldError = useCallback((fieldName) => {
    return !!form.formState.errors[fieldName] || !!serverErrors[fieldName];
  }, [form.formState.errors, serverErrors]);

  return {
    ...form,
    handleSubmit,
    serverErrors,
    clearServerError,
    clearAllServerErrors,
    getFieldError,
    hasFieldError,
    isSubmitting,
    submitSuccess,
    clearSuccess,
    formError: serverErrors._form
  };
};

/**
 * Parse server error message and try to map to specific fields
 * This handles the backend validation format where first error is returned
 */
function parseServerError(errorMessage, formData) {
  if (!errorMessage) return { _form: 'Validation failed' };

  const errors = {};
  
  // Common field name patterns in error messages
  const fieldPatterns = Object.keys(formData).map(field => ({
    field,
    patterns: [
      new RegExp(`${field}\\s+is\\s+required`, 'i'),
      new RegExp(`${field}\\s+must`, 'i'),
      new RegExp(`invalid\\s+${field}`, 'i'),
      new RegExp(`${field.replace(/_/g, '\\s+')}\\s+is\\s+required`, 'i'),
      new RegExp(`${field.replace(/_/g, '\\s+')}\\s+must`, 'i')
    ]
  }));

  // Try to match error message to a field
  for (const { field, patterns } of fieldPatterns) {
    if (patterns.some(pattern => pattern.test(errorMessage))) {
      errors[field] = errorMessage;
      return errors;
    }
  }

  // If no field match, return as form-level error
  errors._form = errorMessage;
  return errors;
}
