import { forwardRef } from 'react';

/**
 * Enhanced Select component that works with react-hook-form
 * Supports real-time validation and server-side error display
 */
const EnhancedSelect = forwardRef(({
  label,
  name,
  options = [],
  error,
  required = false,
  placeholder = "Select an option",
  onChange,
  onBlur,
  ...rest
}, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
          {required ? <span className="text-rose-500"> *</span> : null}
        </label>
      )}
      <select
        id={name}
        name={name}
        ref={ref}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition duration-200 ${
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        }`}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs text-rose-600 animate-fadeIn">{error}</p>
      ) : null}
    </div>
  );
});

EnhancedSelect.displayName = 'EnhancedSelect';

export default EnhancedSelect;
