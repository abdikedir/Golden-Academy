import { CheckCircle } from 'lucide-react';

/**
 * Success feedback component for form submissions
 * Displays a success message with animation
 */
const SuccessFeedback = ({ message = "Success!", show, onClose }) => {
  if (!show) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 animate-fadeIn">
      <CheckCircle className="h-5 w-5 text-emerald-600" />
      <span className="font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto text-emerald-600 hover:text-emerald-800"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SuccessFeedback;
