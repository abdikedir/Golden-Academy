const Modal = ({ open, isOpen, title, onClose, children, size = "default" }) => {
  const isModalOpen = open || isOpen;

  if (!isModalOpen) return null;

  const sizeClasses = {
    default: "sm:max-w-lg",
    large: "sm:max-w-4xl",
    small: "sm:max-w-md",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full ${sizeClasses[size]} max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="modal-title" className="text-base font-semibold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
