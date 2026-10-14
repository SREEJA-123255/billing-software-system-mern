// Builds the JWT header from the token Team 1 login stores in localStorage.
// Never hardcode a token here.
export const getAuthHeaders = (tokenOverride) => {
  const raw = tokenOverride || localStorage.getItem("token") || "";
  const token = String(raw).replace(/^Bearer\s+/i, "");

  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Axios error -> Error with the backend message, so existing
// alert(error.message) calls in the pages keep working.
export const toError = (error, fallback) => {
  const message = error?.response?.data?.message || error?.message || fallback;
  return new Error(message || fallback);
};
