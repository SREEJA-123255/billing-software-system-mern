import apiClient from "./apiClient";

/**
 * Product lookup adapter for Team 4 billing, querying Team 2's live product catalog via apiClient.
 */
export const getProducts = async (params = {}) => {
  try {
    const response = await apiClient.get("/products", { params });
    const list = Array.isArray(response.data) ? response.data : response.data?.data || [];
    return list;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch products";
    throw new Error(message);
  }
};

export const getProductById = async (id) => {
  try {
    const response = await apiClient.get(`/products/${id}`);
    return response.data?.product || response.data || null;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch product";
    throw new Error(message);
  }
};

export default {
  getProducts,
  getProductById
};
