import apiClient from './apiClient';

const formatStatus = (status = '') =>
  status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : '';

const normalizeCustomer = (customer) => {
  if (!customer) return null;
  return {
    ...customer,
    id: customer._id || customer.id,
    status: customer.status || 'Active',
    createdAt: customer.createdAt
      ? customer.createdAt.split('T')[0]
      : '',
  };
};

export const customerService = {
  // GET /api/customers
  getCustomers: async () => {
    const res = await apiClient.get('/customers');
    const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    return list.map(normalizeCustomer);
  },

  // GET /api/customers/:id
  getCustomerById: async (id) => {
    const res = await apiClient.get(`/customers/${id}`);
    const item = res.data?.data || res.data;
    return normalizeCustomer(item);
  },

  // POST /api/customers
  createCustomer: async (customerData) => {
    const payload = {
      name: customerData.name?.trim(),
      phone: customerData.phone?.trim(),
      email: customerData.email?.trim() || '',
      address: customerData.address?.trim() || '',
      gstNumber: customerData.gstNumber?.trim().toUpperCase() || '',
      status: customerData.status || 'Active',
    };

    const res = await apiClient.post('/customers', payload);
    const item = res.data?.data || res.data;
    return normalizeCustomer(item);
  },

  // PUT /api/customers/:id
  updateCustomer: async (id, customerData) => {
    const payload = {
      name: customerData.name?.trim(),
      phone: customerData.phone?.trim(),
      email: customerData.email?.trim() || '',
      address: customerData.address?.trim() || '',
      gstNumber: customerData.gstNumber?.trim().toUpperCase() || '',
      status: customerData.status || 'Active',
    };

    const res = await apiClient.put(`/customers/${id}`, payload);
    const item = res.data?.data || res.data;
    return normalizeCustomer(item);
  },

  // DELETE /api/customers/:id
  deleteCustomer: async (id) => {
    const res = await apiClient.delete(`/customers/${id}`);
    return res.data;
  },

  // PATCH /api/customers/:id/status — toggle Active <-> Inactive
  toggleCustomerStatus: async (id) => {
    const res = await apiClient.patch(`/customers/${id}/status`);
    const item = res.data?.data || res.data;
    return normalizeCustomer(item);
  },

  // GET /api/customers/:id/history
  getCustomerHistory: async (id) => {
    const res = await apiClient.get(`/customers/${id}/history`);
    const data = res.data || {};

    return {
      customer: data.customer,
      count: data.count || 0,
      totalAmount: data.totalAmount || 0,

      purchases: (data.data || []).map((purchase) => ({
        ...purchase,
        id: purchase._id || purchase.id,
        purchaseDate: purchase.purchaseDate
          ? purchase.purchaseDate.split('T')[0]
          : '',
        paymentStatus: formatStatus(purchase.paymentStatus),
      })),
    };
  },
};

export default customerService;