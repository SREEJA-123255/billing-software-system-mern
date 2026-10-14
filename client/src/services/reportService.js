import apiClient from "./apiClient";

/**
 * Team 5 - Report API service using centralized apiClient.
 * Automatically attaches JWT token and handles 401 unauthorized auto-logout.
 */
export const getSalesReport = async (params = {}) => {
  try {
    const response = await apiClient.get("/reports/sales", { params });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch sales report";
    throw new Error(message);
  }
};

export const getPurchaseReport = async (params = {}) => {
  try {
    const response = await apiClient.get("/reports/purchases", { params });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch purchase report";
    throw new Error(message);
  }
};

export const getExpenseReport = async (params = {}) => {
  try {
    const response = await apiClient.get("/reports/expenses", { params });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch expense report";
    throw new Error(message);
  }
};

export const getProfitReport = async (params = {}) => {
  try {
    const response = await apiClient.get("/reports/profit", { params });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch profit report";
    throw new Error(message);
  }
};

export const getStockReport = async () => {
  try {
    const response = await apiClient.get("/reports/stock");
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch stock report";
    throw new Error(message);
  }
};

export default {
  getSalesReport,
  getPurchaseReport,
  getExpenseReport,
  getProfitReport,
  getStockReport
};
