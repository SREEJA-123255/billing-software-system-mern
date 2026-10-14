import apiClient from "./apiClient";

/**
 * Customer lookup adapter for Team 4 billing, querying Team 3's live customers via apiClient.
 */
export const getCustomers = async () => {
  try {
    const response = await apiClient.get("/customers");
    const list = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
      ? response.data
      : [];
    return list;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch customers";
    throw new Error(message);
  }
};

export const getCustomerById = async (id) => {
  try {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data?.data || response.data || null;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Failed to fetch customer";
    throw new Error(message);
  }
};

export default {
  getCustomers,
  getCustomerById
};
