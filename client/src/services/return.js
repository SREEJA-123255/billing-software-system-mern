import apiClient from "./apiClient";

/**
 * Team 4 - Returns API service using centralized apiClient.
 * Automatically attaches JWT token and handles 401 unauthorized redirects.
 */
export const createReturn = async (returnData) => {
  try {
    const response = await apiClient.post("/returns", returnData);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to create return";
    throw new Error(message);
  }
};

export const getReturns = async (params = {}) => {
  try {
    const response = await apiClient.get("/returns", { params });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch returns";
    throw new Error(message);
  }
};

export const getReturnById = async (id) => {
  try {
    const response = await apiClient.get(`/returns/${id}`);
    return response.data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch return details";
    throw new Error(message);
  }
};

export default {
  createReturn,
  getReturns,
  getReturnById
};
