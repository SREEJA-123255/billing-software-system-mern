import apiClient from "./apiClient";

/**
 * Team 4 - Invoice API service using centralized apiClient.
 * Automatically attaches JWT token and handles 401 unauthorized redirects.
 */
export const createInvoice = async (invoiceData) => {
  try {
    const response = await apiClient.post("/invoices", invoiceData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to create invoice";
    throw new Error(message);
  }
};

export const getInvoices = async (params = {}) => {
  try {
    const response = await apiClient.get("/invoices", { params });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch invoices";
    throw new Error(message);
  }
};

export const getInvoiceById = async (id) => {
  try {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch invoice details";
    throw new Error(message);
  }
};

export const updateInvoicePaymentStatus = async (id, paymentStatus, paidAmount) => {
  try {
    const response = await apiClient.patch(`/invoices/${id}/payment-status`, {
      paymentStatus,
      paidAmount
    });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to update payment status";
    throw new Error(message);
  }
};

export default {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoicePaymentStatus
};
