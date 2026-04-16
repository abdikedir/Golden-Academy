import { AlertTriangle, Trash2 } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

const themeMap = {
  danger: {
    panel:
      "border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50",
    blob: "bg-rose-100/70",
    iconWrap: "bg-rose-100 text-rose-600",
    notice: "border-amber-200 bg-amber-50 text-amber-800",
    noticeText: "This action is permanent and may affect linked records.",
    confirmVariant: "danger",
  },
  warning: {
    panel:
      "border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50",
    blob: "bg-amber-100/70",
    iconWrap: "bg-amber-100 text-amber-700",
    notice: "border-orange-200 bg-orange-50 text-orange-800",
    noticeText: "Please confirm this change carefully before continuing.",
    confirmVariant: "primary",
  },
  neutral: {
    panel:
      "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50",
    blob: "bg-slate-200/70",
    iconWrap: "bg-slate-200 text-slate-700",
    notice: "border-slate-200 bg-slate-50 text-slate-700",
    noticeText: "Review the action details and confirm to continue.",
    confirmVariant: "primary",
  },
};

const DeleteConfirmModal = ({
  open,
  title = "Delete record?",
  description = "This action cannot be undone.",
  confirmText = "Delete",
  theme = "danger",
  notice,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const activeTheme = themeMap[theme] || themeMap.danger;

  return (
    <Modal open={open} onClose={onCancel} title="Confirm Action" size="small">
      <div className="animate-fadeIn space-y-4">
        <div
          className={`relative overflow-hidden rounded-2xl border p-4 ${activeTheme.panel}`}
        >
          <div
            className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${activeTheme.blob}`}
          />
          <div className="relative flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${activeTheme.iconWrap}`}
            >
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs leading-5 text-slate-600">{description}</p>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${activeTheme.notice}`}
        >
          <AlertTriangle className="h-4 w-4" />
          {notice || activeTheme.noticeText}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={activeTheme.confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
