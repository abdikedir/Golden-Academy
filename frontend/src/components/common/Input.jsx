const Input = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required = false,
  readOnly = false,
  disabled = false,
}) => {
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
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ""}
        onChange={onChange}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 ${
          error
            ? "border-rose-400 focus:border-rose-500"
            : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        }`}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

export default Input;
