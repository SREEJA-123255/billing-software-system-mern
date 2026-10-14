import apiClient from './apiClient';

const normalizeSupplier = (supplier) => {
  if (!supplier) return null;
  return {
    ...supplier,
    id: supplier._id || supplier.id,
    supplierId: supplier._id || supplier.id,
    status: supplier.status || 'Active',
    createdAt: supplier.createdAt
      ? supplier.createdAt.split('T')[0]
      : '',
  };
};

export const supplierService = {
  // GET /api/suppliers
  getSuppliers: async () => {
    const res = await apiClient.get('/suppliers');
    const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
    return list.map(normalizeSupplier);
  },

  // GET /api/suppliers/:id
  getSupplierById: async (id) => {
    const res = await apiClient.get(`/suppliers/${id}`);
    const item = res.data?.data || res.data;
    return normalizeSupplier(item);
  },

  // POST /api/suppliers
  createSupplier: async (supplierData) => {
    const payload = {
      companyName: supplierData.companyName?.trim(),
      contactPerson: supplierData.contactPerson?.trim() || '',
      phone: supplierData.phone?.trim() || '',
      email: supplierData.email?.trim() || '',
      address: supplierData.address?.trim() || '',
      gstNumber: supplierData.gstNumber?.trim().toUpperCase() || '',
      status: supplierData.status || 'Active',
    };

    const res = await apiClient.post('/suppliers', payload);
    const item = res.data?.data || res.data;
    return normalizeSupplier(item);
  },

  // PUT /api/suppliers/:id
  updateSupplier: async (id, supplierData) => {
    const payload = {
      companyName: supplierData.companyName?.trim(),
      contactPerson: supplierData.contactPerson?.trim() || '',
      phone: supplierData.phone?.trim() || '',
      email: supplierData.email?.trim() || '',
      address: supplierData.address?.trim() || '',
      gstNumber: supplierData.gstNumber?.trim().toUpperCase() || '',
      status: supplierData.status || 'Active',
    };

    const res = await apiClient.put(`/suppliers/${id}`, payload);
    const item = res.data?.data || res.data;
    return normalizeSupplier(item);
  },

  // DELETE /api/suppliers/:id
  deleteSupplier: async (id) => {
    const res = await apiClient.delete(`/suppliers/${id}`);
    return res.data;
  },

  // PATCH /api/suppliers/:id/status — toggle Active <-> Inactive
  toggleSupplierStatus: async (id) => {
    const res = await apiClient.patch(`/suppliers/${id}/status`);
    const item = res.data?.data || res.data;
    return normalizeSupplier(item);
  },
};

export default supplierService;