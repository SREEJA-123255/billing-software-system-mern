import apiClient from "./apiClient";

/**
 * Team 5 - Payment API service using centralized apiClient.
 * Automatically attaches JWT token and handles 401 unauthorized auto-logout.
 */
export const getPayments = async () => {
  try {
    const response = await apiClient.get("/payments");
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch payments";
    throw new Error(message);
  }
};

export const getPaymentById = async (id) => {
  try {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch payment";
    throw new Error(message);
  }
};

export const createPayment = async (paymentData) => {
  try {
    const response = await apiClient.post("/payments", paymentData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to record payment";
    throw new Error(message);
  }
};

export const updatePayment = async (id, paymentData) => {
  try {
    const response = await apiClient.put(`/payments/${id}`, paymentData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to update payment";
    throw new Error(message);
  }
};

export const deletePayment = async (id) => {
  try {
    const response = await apiClient.delete(`/payments/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to delete payment";
    throw new Error(message);
  }
};

export default {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
};
