import { jest } from '@jest/globals'

const mockGetProduct = jest.fn();

jest.unstable_mockModule('../services/stockService.js', () => ({
  getProduct: mockGetProduct,
  increaseStock: jest.fn(),
  decreaseStock: jest.fn(),
}));

const { default: checkStock } = await import('../middleware/checkStock.js');

const PRODUCT_ID = '665f1a2b3c4d5e6f7a8b9c0e';
const PRODUCT_ID_2 = '665f1a2b3c4d5e6f7a8b9c11';

// Fake express response with chainable status().json()
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('checkStock middleware', () => {
  test('calls next and saves products in req.products when stock is enough', async () => {
    mockGetProduct.mockResolvedValue({ _id: PRODUCT_ID, name: 'Pen', stock: 10 });
    const req = { body: { items: [{ product: PRODUCT_ID, quantity: 3 }] } };
    const res = makeRes();
    const next = jest.fn();

    await checkStock(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.products[PRODUCT_ID].name).toBe('Pen');
  });

  test('allows exactly the available stock', async () => {
    mockGetProduct.mockResolvedValue({ _id: PRODUCT_ID, name: 'Pen', stock: 5 });
    const req = { body: { items: [{ product: PRODUCT_ID, quantity: 5 }] } };
    const next = jest.fn();

    await checkStock(req, makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  test('400 with a clear message when stock is not enough', async () => {
    mockGetProduct.mockResolvedValue({ _id: PRODUCT_ID, name: 'Pen', stock: 2 });
    const req = { body: { items: [{ product: PRODUCT_ID, quantity: 5 }] } };
    const res = makeRes();
    const next = jest.fn();

    await checkStock(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const message = res.json.mock.calls[0][0].message;
    expect(message).toMatch(/Insufficient stock for Pen/);
    expect(message).toMatch(/Available: 2/);
    expect(message).toMatch(/requested: 5/);
    expect(next).not.toHaveBeenCalled();
  });

  test('checks every item, second item can fail the request', async () => {
    mockGetProduct
      .mockResolvedValueOnce({ _id: PRODUCT_ID, name: 'Pen', stock: 10 })
      .mockResolvedValueOnce({ _id: PRODUCT_ID_2, name: 'Book', stock: 1 });
    const req = {
      body: {
        items: [
          { product: PRODUCT_ID, quantity: 2 },
          { product: PRODUCT_ID_2, quantity: 4 },
        ],
      },
    };
    const res = makeRes();
    const next = jest.fn();

    await checkStock(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/Book/);
    expect(next).not.toHaveBeenCalled();
  });

  test('temporary Team 2 placeholder (Infinity stock) always passes', async () => {
    mockGetProduct.mockResolvedValue({ _id: PRODUCT_ID, name: 'PENDING TEAM 2 DATA', stock: Infinity });
    const req = { body: { items: [{ product: PRODUCT_ID, quantity: 9999 }] } };
    const next = jest.fn();

    await checkStock(req, makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  test('400 when items is missing or empty', async () => {
    const res1 = makeRes();
    const res2 = makeRes();

    await checkStock({ body: {} }, res1, jest.fn());
    await checkStock({ body: { items: [] } }, res2, jest.fn());

    expect(res1.status).toHaveBeenCalledWith(400);
    expect(res2.status).toHaveBeenCalledWith(400);
  });

  test('400 for an invalid product id', async () => {
    const req = { body: { items: [{ product: 'abc', quantity: 1 }] } };
    const res = makeRes();

    await checkStock(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockGetProduct).not.toHaveBeenCalled();
  });

  test.each([0, -2, 1.5, '3', undefined])('400 when quantity is %p', async (qty) => {
    const req = { body: { items: [{ product: PRODUCT_ID, quantity: qty }] } };
    const res = makeRes();

    await checkStock(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('404 when the product is not found', async () => {
    mockGetProduct.mockResolvedValue(null);
    const req = { body: { items: [{ product: PRODUCT_ID, quantity: 1 }] } };
    const res = makeRes();
    const next = jest.fn();

    await checkStock(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  test('500 when the product service throws', async () => {
    mockGetProduct.mockRejectedValue(new Error('Team 2 down'));
    const req = { body: { items: [{ product: PRODUCT_ID, quantity: 1 }] } };
    const res = makeRes();

    await checkStock(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
