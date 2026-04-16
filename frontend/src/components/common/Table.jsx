import { useMemo, useState } from "react";
import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";

const normalizeSearchValue = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const collectSearchTokens = (value, tokens) => {
  if (value === null || value === undefined) return;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    tokens.push(String(value));
    return;
  }

  if (value instanceof Date) {
    tokens.push(value.toISOString());
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSearchTokens(item, tokens));
    return;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectSearchTokens(item, tokens));
  }
};

const buildRowSearchText = (row) => {
  const tokens = [];
  collectSearchTokens(row, tokens);
  return normalizeSearchValue(tokens.join(" "));
};

const Table = ({
  columns = [],
  rows = [],
  loading = false,
  error = "",
  pageSize = 10,
  searchPlaceholder = "Search records...",
  pageSizeOptions = [10, 20, 50],
}) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [activePageSize, setActivePageSize] = useState(pageSize);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const value = normalizeSearchValue(search);
    return rows.filter((row) => buildRowSearchText(row).includes(value));
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === bv) return 0;
      if (sortOrder === "asc") return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
  }, [filteredRows, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / activePageSize));
  const currentPageRows = sortedRows.slice(
    (page - 1) * activePageSize,
    page * activePageSize,
  );

  const onSort = (key, sortable = true) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortOrder("asc");
  };

  const getSortIndicator = (key) => {
    if (sortKey !== key) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
        <div className="flex items-center gap-2">
          <p className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {sortedRows.length} records
          </p>
          <select
            value={activePageSize}
            onChange={(event) => {
              setActivePageSize(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto rounded-xl border border-emerald-100 bg-white shadow-sm sm:mx-0">
        <table className="min-w-full divide-y divide-emerald-100 text-sm">
          <thead className="bg-emerald-50/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-700 ${
                    column.sortable === false ? "" : "cursor-pointer"
                  }`}
                  onClick={() => onSort(column.key, column.sortable !== false)}
                >
                  {column.title}
                  {column.sortable === false
                    ? ""
                    : getSortIndicator(column.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-50">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  <div className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin text-emerald-600" />
                    Loading records...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center font-medium text-rose-600"
                >
                  <div className="inline-flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </td>
              </tr>
            ) : currentPageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  <div className="inline-flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    No records available
                  </div>
                </td>
              </tr>
            ) : (
              currentPageRows.map((row, index) => (
                <tr
                  key={row.id || row[columns[0].key] || index}
                  className="transition hover:bg-emerald-50/40"
                >
                  {columns.map((column) => (
                    <td
                      key={`${index}-${column.key}`}
                      className="px-3 py-2.5 text-slate-700"
                    >
                      {column.render
                        ? column.render(row)
                        : String(row[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
        >
          Prev
        </button>
        <span className="text-xs font-semibold text-slate-600">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Table;
