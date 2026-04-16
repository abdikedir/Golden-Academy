import { Link } from "react-router-dom";
import RegisterForm from "../components/auth/RegisterForm";

const RegisterPage = () => {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-3 py-5 sm:px-5 sm:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 top-8 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -left-20 bottom-4 h-72 w-72 rounded-full bg-teal-200/35 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative bg-emerald-700 p-5 text-white sm:p-7 lg:p-10">
          <div className="pointer-events-none absolute -left-8 -top-10 h-32 w-32 rounded-full bg-emerald-500/50 blur-2xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-100">
              Golden High School
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
              Account Registration
            </h2>
            <p className="mt-2 text-sm text-emerald-50 sm:max-w-md">
              Create secure user access with the right role so each staff member
              sees only their authorized tools.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-emerald-100">
                  Secure
                </p>
                <p className="text-sm font-bold">Role Setup</p>
              </div>
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-emerald-100">
                  Fast
                </p>
                <p className="text-sm font-bold">Onboarding</p>
              </div>
              <div className="rounded-xl bg-white/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-emerald-100">
                  Reliable
                </p>
                <p className="text-sm font-bold">Access Policy</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-[1.9rem]">
              Register Account
            </h1>
            <p className="mb-6 mt-1 text-sm text-slate-500">
              Complete registration with role-based permissions.
            </p>
            <RegisterForm />
            <p className="mt-4 text-sm text-slate-600">
              Already registered?{" "}
              <Link
                to="/login"
                className="font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
