const TableSection = ({ title, actions = null, children }) => {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
};

export default TableSection;
