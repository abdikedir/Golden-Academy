import { toast } from "react-toastify";

const toastByType = {
  success: toast.success,
  error: toast.error,
  warning: toast.warning,
  info: toast.info,
};

export const notify = ({ type = "info", message }) => {
  if (!message) return;
  const showToast = toastByType[type] || toast.info;
  showToast(message);
};

export const subscribeNotifications = () => () => {};
