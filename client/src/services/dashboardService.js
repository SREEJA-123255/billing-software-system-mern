import apiClient from "./apiClient";

/**
 * Team 5 - Dashboard API service using centralized apiClient.
 * Automatically attaches JWT token and handles 401 unauthorized auto-logout.
 */
export const getDashboard = async () => {
  try {
    const response = await apiClient.get("/dashboard");
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch dashboard metrics";
    throw new Error(message);
  }
};

export default {
  getDashboard
};
