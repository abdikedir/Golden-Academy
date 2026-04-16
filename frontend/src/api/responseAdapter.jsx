export const extractPayload = (response) =>
  response?.data?.data ?? response?.data ?? null;

export const extractArray = (response) => {
  const payload = extractPayload(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const extractObject = (response) => {
  const payload = extractPayload(response);
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload;
  }
  return {};
};

export const extractErrorMessage = (error, fallback = "Request failed") => {
  // Handle different error response structures from backend
  if (error?.response?.data) {
    const data = error.response.data;
    // Backend sends errors in 'message' field
    if (data.message) return data.message;
    // Fallback to 'error' field if present
    if (data.error) return data.error;
    // Validation detail arrays from some APIs
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      if (typeof first === "string") return first;
      if (first?.msg) return first.msg;
      if (first?.message) return first.message;
    }
  }
  // Common axios/network-level messages
  if (error?.code === "ECONNABORTED")
    return "Request timed out. Please try again.";
  if (error?.response?.status === 401)
    return "Your session has expired. Please sign in again.";
  if (error?.response?.status === 403)
    return "You are not allowed to perform this action.";
  if (error?.response?.status === 404)
    return "Requested resource was not found.";
  if (error?.response?.status >= 500)
    return "Server error. Please try again later.";
  // Network or other errors
  if (error?.message) return error.message;
  return fallback;
};
