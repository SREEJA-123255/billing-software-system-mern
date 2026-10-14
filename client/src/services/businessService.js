import apiClient from "./apiClient";

const businessService = {
  // Get business profile
  getBusiness: async () => {
    const response = await apiClient.get("/business");
    return response.data;
  },

  // Update business profile & logo
  updateBusiness: async (data, isFormData = false) => {
    const config = isFormData
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : {};
    const response = await apiClient.put("/business", data, config);
    return response.data;
  }
};

export default businessService;
