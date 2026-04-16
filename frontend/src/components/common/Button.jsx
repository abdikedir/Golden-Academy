import { LoaderCircle } from "lucide-react";

const Button = ({
  children,
  type = "button",
  variant = "primary",
  size = "default",
  className = "",
  loading = false,
  loadingText = "Processing...",
  ...rest
}) => {
  const variants = {
    primary:
      "bg-emerald-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50",
    danger:
      "bg-rose-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-rose-700",
  };

  const sizes = {
    sm: "px-2 py-1 text-xs",
    default: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      className={`rounded-lg font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
