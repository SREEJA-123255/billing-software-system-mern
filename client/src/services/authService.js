import apiClient from "./apiClient";

const authService = {
  // Login user with credentials
  login: async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  },

  // Google OAuth Login
  googleLogin: async (data) => {
    const response = await apiClient.post("/auth/google", data);
    return response.data;
  },

  // Request 6-digit OTP sent to user's email
  forgotPassword: async (email) => {
    const response = await apiClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  // Verify 6-digit OTP
  verifyOtp: async (email, otp) => {
    const response = await apiClient.post("/auth/verify-otp", { email, otp });
    return response.data;
  },

  // Reset password using 6-digit OTP
  resetPasswordWithOtp: async ({ email, otp, password }) => {
    const response = await apiClient.post("/auth/reset-password", { email, otp, password });
    return response.data;
  },

  // Get current user profile
  getMe: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  }
};

export default authService;
