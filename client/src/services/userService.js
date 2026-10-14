import apiClient from "./apiClient";

const sanitizeParam = (val) => {
  if (val === null || val === undefined) return undefined;
  if (typeof val === "object") {
    return val?.target?.value ?? val?.value ?? String(val);
  }
  return val;
};

const userService = {
  // Get users list with optional search, role, status, page, and limit
  getUsers: async (params = {}) => {
    const sanitizedParams = {};
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        sanitizedParams[key] = sanitizeParam(val);
      }
    }
    const response = await apiClient.get("/users", { params: sanitizedParams });
    return response.data;
  },

  // Get single user by ID
  getUserById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  // Create new user (Admin only)
  createUser: async (userData) => {
    const response = await apiClient.post("/users", userData);
    return response.data;
  },

  // Update user details (Admin only)
  updateUser: async (id, userData) => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },

  // Soft activate / deactivate user status (Admin only)
  toggleUserStatus: async (id, status) => {
    const response = await apiClient.patch(`/users/${id}/status`, { status });
    return response.data;
  },

  // Delete user account (Admin only)
  deleteUser: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  }
};

export default userService;
