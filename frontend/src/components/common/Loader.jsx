import { LoaderCircle } from "lucide-react";

const Loader = ({ text = "Loading..." }) => {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <LoaderCircle className="h-4 w-4 animate-spin text-emerald-600" />
      {text}
    </div>
  );
};

export default Loader;
