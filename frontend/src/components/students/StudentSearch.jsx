import { useState } from "react";
import { Search } from "lucide-react";
import Input from "../common/Input";
import Button from "../common/Button";
import Table from "../common/Table";

const StudentSearch = ({ onSearch, results = [], loading = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSearched(true);
    await onSearch(searchTerm);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search by student ID, school ID, or name (partial/case-insensitive)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button type="submit" loading={loading}>
          <span className="inline-flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </span>
        </Button>
      </form>

      {results.length > 0 && (
        <Table
          rows={results}
          columns={[
            { key: "studentId", title: "ID" },
            { key: "studentSchoolId", title: "School ID" },
            { key: "fullName", title: "Name" },
            { key: "gender", title: "Gender" },
          ]}
          searchPlaceholder="Filter results..."
          pageSize={10}
        />
      )}

      {hasSearched && !loading && results.length === 0 && searchTerm.trim() ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          No students matched "{searchTerm}". Try another part of ID, school ID,
          or name.
        </div>
      ) : null}
    </div>
  );
};

export default StudentSearch;
