import { jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'

const mockSale = { findById: jest.fn() };
const mockInvoice = { findOne: jest.fn(), create: jest.fn(), find: jest.fn(), findById: jest.fn() };
const mockGenerateInvoiceNumber = jest.fn();
const mockGetProduct = jest.fn();
const mockGetBusinessDetails = jest.fn();

jest.unstable_mockModule('../model/sale.js', () => ({ default: mockSale }));
jest.unstable_mockModule('../model/invoice.js', () => ({ default: mockInvoice }));
jest.unstable_mockModule('../utils/generateInvoiceNumber.js', () => ({
  generateInvoiceNumber: mockGenerateInvoiceNumber,
}));
jest.unstable_mockModule('../services/stockService.js', () => ({
  getProduct: mockGetProduct,
  increaseStock: jest.fn(),
  decreaseStock: jest.fn(),
}));
jest.unstable_mockModule('../services/businessService.js', () => ({
  getBusinessDetails: mockGetBusinessDetails,
}));

const { default: invoiceRoutes } = await import('../routes/invoiceRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/invoices', invoiceRoutes);

const SALE_ID = '665f1a2b3c4d5e6f7a8b9c0d';
const PRODUCT_ID = '665f1a2b3c4d5e6f7a8b9c0e';
const CUSTOMER_ID = '665f1a2b3c4d5e6f7a8b9c0f';
const INVOICE_ID = '665f1a2b3c4d5e6f7a8b9c10';

const makeSale = (overrides = {}) => ({
  _id: SALE_ID,
  customer: CUSTOMER_ID,
  items: [{ product: PRODUCT_ID, quantity: 2, price: 100, total: 200 }],
  subtotal: 200,
  discount: { type: 'percentage', value: 10 },
  tax: 32.4,
  grandTotal: 212.4,
  paymentMethod: 'Cash',
  paymentStatus: 'Paid',
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  mockGetProduct.mockResolvedValue({ _id: PRODUCT_ID, name: 'Pen', price: 100, stock: 50 });
  mockGenerateInvoiceNumber.mockResolvedValue('INV-0001');
  mockGetBusinessDetails.mockResolvedValue({
    name: 'Apex Billing Solutions',
    address: '123 Commercial Street',
    gstin: '29AAAAA0000A1Z5',
    phone: '+91 9876543210',
  });
  mockInvoice.create.mockImplementation(async (doc) => ({ _id: INVOICE_ID, ...doc }));
});

describe('POST /api/invoices', () => {
  test('creates an invoice with a snapshot of the sale (percentage discount)', async () => {
    mockSale.findById.mockResolvedValue(makeSale());
    mockInvoice.findOne.mockResolvedValue(null);

    const res = await request(app).post('/api/invoices').send({ saleId: SALE_ID });

    expect(res.status).toBe(201);
    expect(res.body.invoiceNumber).toBe('INV-0001');
    expect(res.body.subtotal).toBe(200);
    expect(res.body.discountAmount).toBe(20);
    expect(res.body.taxAmount).toBe(32.4);
    expect(res.body.grandTotal).toBe(212.4);
    expect(res.body.paymentMethod).toBe('Cash');
    expect(res.body.paymentStatus).toBe('Paid');
    expect(res.body.items).toEqual([{ productName: 'Pen', quantity: 2, price: 100, total: 200 }]);
    expect(mockInvoice.create).toHaveBeenCalledTimes(1);
  });

  test('fixed discount is copied as it is', async () => {
    mockSale.findById.mockResolvedValue(makeSale({ discount: { type: 'fixed', value: 15 } }));
    mockInvoice.findOne.mockResolvedValue(null);

    const res = await request(app).post('/api/invoices').send({ saleId: SALE_ID });

    expect(res.status).toBe(201);
    expect(res.body.discountAmount).toBe(15);
  });

  test('business details come from Team 1 (real integration, mocked here)', async () => {
    mockSale.findById.mockResolvedValue(makeSale());
    mockInvoice.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', 'Bearer sometoken')
      .send({ saleId: SALE_ID });

    expect(res.status).toBe(201);
    expect(res.body.businessDetails.name).toBe('Apex Billing Solutions');
    expect(res.body.businessDetails.gstin).toBe('29AAAAA0000A1Z5');
    expect(mockGetBusinessDetails).toHaveBeenCalledWith('Bearer sometoken');
  });


  test('placeholder customer name is NOT empty (schema needs customerDetails.name)', async () => {
    mockSale.findById.mockResolvedValue(makeSale());
    mockInvoice.findOne.mockResolvedValue(null);

    const res = await request(app).post('/api/invoices').send({ saleId: SALE_ID });


    expect(res.body.customerDetails.name).not.toBe('');
  });

  test('500 when Team 1 business service fails', async () => {
    mockSale.findById.mockResolvedValue(makeSale());
    mockInvoice.findOne.mockResolvedValue(null);
    mockGetBusinessDetails.mockRejectedValue(new Error('Failed to fetch business details from Team 1 (status 401)'));

    const res = await request(app).post('/api/invoices').send({ saleId: SALE_ID });

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/Team 1/);
  });

  test('400 when saleId is missing', async () => {
    const res = await request(app).post('/api/invoices').send({});
    expect(res.status).toBe(400);
    expect(mockSale.findById).not.toHaveBeenCalled();
  });

  test('400 when saleId is not a valid ObjectId', async () => {
    const res = await request(app).post('/api/invoices').send({ saleId: 'abc' });
    expect(res.status).toBe(400);
  });

  test('404 when the sale does not exist', async () => {
    mockSale.findById.mockResolvedValue(null);

    const res = await request(app).post('/api/invoices').send({ saleId: SALE_ID });

    expect(res.status).toBe(404);
    expect(mockInvoice.create).not.toHaveBeenCalled();
  });

  test('409 when an invoice already exists for the sale', async () => {
    mockSale.findById.mockResolvedValue(makeSale());
    mockInvoice.findOne.mockResolvedValue({ _id: INVOICE_ID, invoiceNumber: 'INV-0001' });

    const res = await request(app).post('/api/invoices').send({ saleId: SALE_ID });

    expect(res.status).toBe(409);
    expect(mockInvoice.create).not.toHaveBeenCalled();
    expect(mockGenerateInvoiceNumber).not.toHaveBeenCalled();
  });

  test('500 when saving the invoice fails', async () => {
    mockSale.findById.mockResolvedValue(makeSale());
    mockInvoice.findOne.mockResolvedValue(null);
    mockInvoice.create.mockRejectedValue(new Error('DB down'));

    const res = await request(app).post('/api/invoices').send({ saleId: SALE_ID });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('DB down');
  });
});

describe('GET /api/invoices', () => {
  test('lists invoices', async () => {
    const sort = jest.fn().mockResolvedValue([{ _id: INVOICE_ID }]);
    mockInvoice.find.mockReturnValue({ sort });

    const res = await request(app).get('/api/invoices');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test('applies from, to and paymentStatus filters', async () => {
    mockInvoice.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

    await request(app).get('/api/invoices?from=2026-01-01&to=2026-01-31&paymentStatus=Paid');

    expect(mockInvoice.find).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'Paid',
        invoiceDate: expect.objectContaining({ $gte: expect.any(Date), $lte: expect.any(Date) }),
      })
    );
  });

  test('no filters gives an empty filter object', async () => {
    mockInvoice.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

    await request(app).get('/api/invoices');

    expect(mockInvoice.find).toHaveBeenCalledWith({});
  });

  test.each(['from', 'to'])('400 for an invalid %s date, does not touch the database', async (name) => {
    const res = await request(app).get(`/api/invoices?${name}=invalid-date`);

    expect(res.status).toBe(400);
    expect(mockInvoice.find).not.toHaveBeenCalled();
  });
});

describe('GET /api/invoices/:id', () => {
  test('returns one invoice', async () => {
    mockInvoice.findById.mockResolvedValue({ _id: INVOICE_ID, invoiceNumber: 'INV-0001' });

    const res = await request(app).get(`/api/invoices/${INVOICE_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.invoiceNumber).toBe('INV-0001');
  });

  test('400 for an invalid id', async () => {
    const res = await request(app).get('/api/invoices/abc');
    expect(res.status).toBe(400);
  });

  test('404 when not found', async () => {
    mockInvoice.findById.mockResolvedValue(null);

    const res = await request(app).get(`/api/invoices/${INVOICE_ID}`);

    expect(res.status).toBe(404);
  });
});
