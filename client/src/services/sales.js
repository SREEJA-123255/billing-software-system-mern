import apiClient from "./apiClient";

/**
 * Team 4 - Sales API service using centralized apiClient.
 * Automatically attaches JWT token and handles 401 unauthorized redirects.
 */
export const createSale = async (saleData) => {
  try {
    const response = await apiClient.post("/sales", saleData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to create sale";
    throw new Error(message);
  }
};

export const getSales = async (params = {}) => {
  try {
    const response = await apiClient.get("/sales", { params });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch sales";
    throw new Error(message);
  }
};

export const getSaleById = async (id) => {
  try {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch sale details";
    throw new Error(message);
  }
};

export default {
  createSale,
  getSales,
  getSaleById
};
