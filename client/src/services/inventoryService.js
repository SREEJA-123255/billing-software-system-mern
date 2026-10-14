import apiClient from "./apiClient";

const inventoryService = {
  // Get all inventory items with optional filters
  getInventoryItems: async (params = {}) => {
    const response = await apiClient.get("/inventory", { params });
    return response.data;
  },

  // Get single inventory item by ID
  getInventoryItemById: async (id) => {
    const response = await apiClient.get(`/inventory/${id}`);
    return response.data;
  },

  // Get inventory metrics summary
  getSummary: async () => {
    const response = await apiClient.get("/inventory/summary");
    return response.data;
  },

  // Get low stock items
  getLowStockItems: async () => {
    const response = await apiClient.get("/inventory/low-stock");
    return response.data;
  },

  // Adjust inventory stock quantity
  adjustStock: async (productId, data = {}) => {
    const payload = typeof productId === "object" && productId !== null
      ? productId
      : { productId, ...data };
    const response = await apiClient.patch("/inventory/adjust", payload);
    return response.data;
  },

  adjustInventory: async (adjustmentData) => {
    const response = await apiClient.patch("/inventory/adjust", adjustmentData);
    return response.data;
  },

  // Create new inventory item
  createInventoryItem: async (itemData) => {
    const response = await apiClient.post("/inventory", itemData);
    return response.data;
  },

  // Update inventory item
  updateInventoryItem: async (id, itemData) => {
    const response = await apiClient.put(`/inventory/${id}`, itemData);
    return response.data;
  },

  // Delete inventory item
  deleteInventoryItem: async (id) => {
    const response = await apiClient.delete(`/inventory/${id}`);
    return response.data;
  }
};

export default inventoryService;
