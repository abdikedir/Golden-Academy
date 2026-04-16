import { useState } from "react";

export const useForm = ({ initialValues, onSubmit, validate }) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate ? validate(values) : {};
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      await onSubmit(values);
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  return {
    values,
    errors,
    setValues,
    setErrors,
    handleChange,
    handleSubmit,
    reset,
  };
};
