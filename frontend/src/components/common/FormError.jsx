import { AlertCircle } from 'lucide-react';

/**
 * Form-level error display component
 * Shows general form errors that don't belong to specific fields
 */
const FormError = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-800 animate-fadeIn">
      <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{error}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-rose-600 hover:text-rose-800 flex-shrink-0"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default FormError;
