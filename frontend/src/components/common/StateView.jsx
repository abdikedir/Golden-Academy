import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";

const styles = {
  loading: {
    icon: LoaderCircle,
    iconClass: "animate-spin text-emerald-600",
    title: "Loading",
    description: "Please wait while data is being prepared.",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-rose-600",
    title: "Unable to Load Data",
    description: "An unexpected error occurred while processing your request.",
  },
  empty: {
    icon: Inbox,
    iconClass: "text-slate-500",
    title: "No Records Available",
    description: "There are currently no records to display.",
  },
};

const StateView = ({
  type = "empty",
  title,
  description,
  action,
  className = "",
}) => {
  const config = styles[type] || styles.empty;
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border border-emerald-100 bg-white px-4 py-8 text-center ${className}`}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
        <Icon className={`h-6 w-6 ${config.iconClass}`} />
      </div>
      <h3 className="text-base font-semibold text-slate-900">
        {title || config.title}
      </h3>
      <p className="mx-auto mt-1 max-w-xl text-sm text-slate-600">
        {description || config.description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};

export default StateView;
