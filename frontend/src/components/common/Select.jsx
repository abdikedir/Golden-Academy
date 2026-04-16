const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  disabled = false,
}) => {
  return (
    <div className="space-y-1">
      {label ? (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
          {required ? <span className="text-rose-500"> *</span> : null}
        </label>
      ) : null}
      <select
        id={name}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition duration-200 ${
          error
            ? "border-rose-400"
            : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        }`}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

export default Select;
