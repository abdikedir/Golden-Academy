import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

const PageLayout = ({ title, children, actions = null }) => {
  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <div className="mx-auto flex max-w-[1600px] lg:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-3 pb-6 sm:p-4 lg:p-6 lg:pb-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2 sm:mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                Academic Administration
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                {title}
              </h2>
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
          <div className="space-y-4">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default PageLayout;
