import apiClient from "./apiClient";

const categoryService = {
  // Get all categories with optional search and status filter
  getCategories: async (params = {}) => {
    const response = await apiClient.get("/categories", { params });
    return response.data;
  },

  // Get category by ID
  getCategoryById: async (id) => {
    const response = await apiClient.get(`/categories/${id}`);
    return response.data;
  },

  // Create new category
  createCategory: async (categoryData) => {
    const response = await apiClient.post("/categories", categoryData);
    return response.data;
  },

  // Update category
  updateCategory: async (id, categoryData) => {
    const response = await apiClient.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  // Soft delete / deactivate or permanent delete category
  deleteCategory: async (id, params = {}) => {
    const response = await apiClient.delete(`/categories/${id}`, { params });
    return response.data;
  },

  // Permanently delete category
  permanentlyDeleteCategory: async (id) => {
    const response = await apiClient.delete(`/categories/${id}`, {
      params: { permanent: true }
    });
    return response.data;
  }
};

export default categoryService;
