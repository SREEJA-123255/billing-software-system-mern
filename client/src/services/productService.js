import apiClient from "./apiClient";

const productService = {
  // Get all products with optional filters
  getProducts: async (params = {}) => {
    const response = await apiClient.get("/products", { params });
    return response.data;
  },

  // Get product by ID
  getProductById: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  // Create new product
  createProduct: async (productData) => {
    const response = await apiClient.post("/products", productData);
    return response.data;
  },

  // Update product
  updateProduct: async (id, productData) => {
    const response = await apiClient.put(`/products/${id}`, productData);
    return response.data;
  },

  // Delete / deactivate product
  deleteProduct: async (id) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  // Update product status (ACTIVE / INACTIVE)
  updateProductStatus: async (id, status) => {
    const response = await apiClient.patch(`/products/${id}/status`, { status });
    return response.data;
  }
};

export default productService;

