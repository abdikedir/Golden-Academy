import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <ShieldAlert className="h-7 w-7 text-emerald-700" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
          Golden High School
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Page Not Found
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          The requested page is unavailable or may have been moved.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Return to Dashboard
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
