import apiClient from './apiClient';

const formatStatus = (status = '') =>
  status
    ? status.charAt(0).toUpperCase() +
      status.slice(1).toLowerCase()
    : '';

const normalizePurchase = (purchase) => {
  if (!purchase) return null;
  const populatedSupplier =
    purchase.supplierId &&
    typeof purchase.supplierId === 'object'
      ? purchase.supplierId
      : null;

  return {
    ...purchase,
    id: purchase._id || purchase.id,
    purchaseId: purchase.purchaseId,

    supplierId:
      populatedSupplier?._id ||
      (typeof purchase.supplierId === 'string' ? purchase.supplierId : '') ||
      '',

    supplierName:
      populatedSupplier?.companyName ||
      purchase.supplierName ||
      '',

    purchaseDate: purchase.purchaseDate
      ? purchase.purchaseDate.split('T')[0]
      : '',

    paymentStatus: formatStatus(
      purchase.paymentStatus
    ),

    status: purchase.status
      ? String(purchase.status).toUpperCase()
      : 'ACTIVE',

    grandTotal:
      purchase.totalAmount ?? 0,

    taxAmount:
      purchase.tax ?? 0,

    discountAmount:
      purchase.discount ?? 0,

    items: (purchase.items || []).map(
      (item) => ({
        ...item,

        productId:
          item.productId && typeof item.productId === 'object'
            ? item.productId._id || ''
            : (item.productId || ''),

        productName:
          item.productId && typeof item.productId === 'object' && item.productId.productName
            ? item.productId.productName
            : (item.productName || 'Product'),

        sku:
          item.productId && typeof item.productId === 'object' && item.productId.sku
            ? item.productId.sku
            : (item.sku || ''),
      })
    ),
  };
};

export const generatePurchaseId = (
  purchases = []
) => {
  const maxNumber = purchases.reduce(
    (max, purchase) => {
      const match = String(
        purchase.purchaseId || ''
      ).match(/PUR-(\d+)/i);

      const number = match
        ? Number(match[1])
        : 0;

      return Math.max(max, number);
    },
    0
  );

  return `PUR-${String(
    maxNumber + 1
  ).padStart(3, '0')}`;
};

export const purchaseService = {
  getPurchases: async (filters = {}) => {
    const params = {};

    if (filters.from) {
      params.from = filters.from;
    }

    if (filters.to) {
      params.to = filters.to;
    }

    if (filters.supplier) {
      params.supplier = filters.supplier;
    }

    const res = await apiClient.get('/purchases', { params });
    const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);

    return list.map(normalizePurchase);
  },

  getPurchaseById: async (id) => {
    const res = await apiClient.get(`/purchases/${id}`);
    const item = res.data?.data || res.data;

    return normalizePurchase(item);
  },

  createPurchase: async (purchaseData) => {
    const payload = {
      purchaseId:
        purchaseData.purchaseId,

      supplierId:
        purchaseData.supplierId,

      ...(purchaseData.customerId
        ? {
            customerId:
              purchaseData.customerId,
          }
        : {}),

      purchaseDate:
        purchaseData.purchaseDate,

      items: (
        purchaseData.items || []
      ).map((item) => ({
        productId:
          item.productId,

        quantity: Number(
          item.quantity
        ),

        purchasePrice: Number(
          item.purchasePrice
        ),

        tax: Number(
          item.tax || 0
        ),
      })),

      subtotal: Number(
        purchaseData.subtotal || 0
      ),

      discount: Number(
        purchaseData.discount || 0
      ),

      tax: Number(
        purchaseData.tax || 0
      ),

      totalAmount: Number(
        purchaseData.totalAmount || 0
      ),

      paymentStatus:
        purchaseData.paymentStatus?.toLowerCase(),
    };

    const res = await apiClient.post('/purchases', payload);
    const item = res.data?.data || res.data;
    return normalizePurchase(item);
  },

  // PUT /api/purchases/:id
  updatePurchase: async (id, purchaseData) => {
    const payload = {
      purchaseId: purchaseData.purchaseId,
      supplierId: purchaseData.supplierId,

      ...(purchaseData.customerId
        ? { customerId: purchaseData.customerId }
        : {}),

      purchaseDate: purchaseData.purchaseDate,

      items: (purchaseData.items || []).map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice),
        tax: Number(item.tax || 0),
      })),

      subtotal: Number(purchaseData.subtotal || 0),
      discount: Number(purchaseData.discount || 0),
      tax: Number(purchaseData.tax || 0),
      totalAmount: Number(purchaseData.totalAmount || 0),
      paymentStatus: purchaseData.paymentStatus?.toLowerCase(),
    };

    const res = await apiClient.put(`/purchases/${id}`, payload);
    const item = res.data?.data || res.data;
    return normalizePurchase(item);
  },

  // PUT /api/purchases/:id/status or /api/purchases/:id (status only toggle)
  updatePurchaseStatus: async (id, status) => {
    let res;
    try {
      res = await apiClient.put(`/purchases/${id}/status`, { status });
    } catch {
      res = await apiClient.put(`/purchases/${id}`, { status });
    }
    const item = res.data?.data || res.data;
    return normalizePurchase(item);
  },

  // DELETE /api/purchases/:id
  deletePurchase: async (id) => {
    const res = await apiClient.delete(`/purchases/${id}`);
    return res.data;
  },
};

export default purchaseService;