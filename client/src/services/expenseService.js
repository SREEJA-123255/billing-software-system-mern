import apiClient from "./apiClient";

/**
 * Team 5 - Expense API service using centralized apiClient.
 * Automatically attaches JWT token and handles 401 unauthorized auto-logout.
 */
export const getExpenses = async () => {
  try {
    const response = await apiClient.get("/expenses");
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch expenses";
    throw new Error(message);
  }
};

export const getExpenseById = async (id) => {
  try {
    const response = await apiClient.get(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch expense";
    throw new Error(message);
  }
};

export const createExpense = async (expenseData) => {
  try {
    const response = await apiClient.post("/expenses", expenseData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to create expense";
    throw new Error(message);
  }
};

export const updateExpense = async (id, expenseData) => {
  try {
    const response = await apiClient.put(`/expenses/${id}`, expenseData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to update expense";
    throw new Error(message);
  }
};

export const deleteExpense = async (id) => {
  try {
    const response = await apiClient.delete(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to delete expense";
    throw new Error(message);
  }
};

export default {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense
};
