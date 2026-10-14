import { jest } from '@jest/globals'
import express from 'express'
import request from 'supertest'

const mockSale = { create: jest.fn(), find: jest.fn(), findById: jest.fn() };
const mockGetProduct = jest.fn();
const mockDecreaseStock = jest.fn();
const mockIncreaseStock = jest.fn();

jest.unstable_mockModule('../model/sale.js', () => ({ default: mockSale }));
jest.unstable_mockModule('../services/stockService.js', () => ({
    getProduct: mockGetProduct,
    decreaseStock: mockDecreaseStock,
    increaseStock: mockIncreaseStock,
}));


const USER_ID = '665f1a2b3c4d5e6f7a8b9c20';
jest.unstable_mockModule('../middleware/verifyToken.js', () => ({
    default: (req, res, next) => {
        req.user = { _id: USER_ID };
        next();
    },
}));

const { default: saleRoutes } = await import('../routes/saleRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/sales', saleRoutes);

const CUSTOMER_ID = '665f1a2b3c4d5e6f7a8b9c0f';
const PRODUCT_ID = '665f1a2b3c4d5e6f7a8b9c0e';
const PRODUCT_ID_2 = '665f1a2b3c4d5e6f7a8b9c11';
const SALE_ID = '665f1a2b3c4d5e6f7a8b9c0d';

const products = {
    [PRODUCT_ID]: { _id: PRODUCT_ID, name: 'Pen', price: 100, stock: 50 },
    [PRODUCT_ID_2]: { _id: PRODUCT_ID_2, name: 'Book', price: 50, stock: 20 },
};

const validBody = () => ({
    customer: CUSTOMER_ID,
    items: [{ product: PRODUCT_ID, quantity: 2 }],
    discount: { type: 'percentage', value: 10 },
    taxRate: 18,
    paymentMethod: 'UPI',
    paymentStatus: 'Paid',
});

beforeEach(() => {
    jest.resetAllMocks();
    mockGetProduct.mockImplementation(async (id) => products[id] ?? null);
    mockDecreaseStock.mockResolvedValue(true);
    mockIncreaseStock.mockResolvedValue(true);
    mockSale.create.mockImplementation(async (doc) => ({ _id: SALE_ID, ...doc }));
});

describe('POST /api/sales', () => {
    test('creates a sale: price from product, discount, tax, totals', async () => {
        const res = await request(app).post('/api/sales').send(validBody());

        expect(res.status).toBe(201);
        expect(res.body.subtotal).toBe(200);
        expect(res.body.tax).toBe(32.4);
        expect(res.body.grandTotal).toBe(212.4);
        expect(res.body.discount).toEqual({ type: 'percentage', value: 10 });
        expect(res.body.items).toEqual([{ product: PRODUCT_ID, quantity: 2, price: 100, total: 200 }]);
        expect(mockSale.create).toHaveBeenCalledWith(
            expect.objectContaining({
                customer: CUSTOMER_ID,
                paymentMethod: 'UPI',
                paymentStatus: 'Paid',
            })
        );
    });

    test('uses the price sent by the client when given', async () => {
        const body = validBody();
        body.items = [{ product: PRODUCT_ID, quantity: 2, price: 90 }];
        body.discount = undefined;
        body.taxRate = undefined;

        const res = await request(app).post('/api/sales').send(body);

        expect(res.status).toBe(201);
        expect(res.body.subtotal).toBe(180);
        expect(res.body.grandTotal).toBe(180);
    });

    test('no discount and no tax gives fixed 0 discount and tax 0', async () => {
        const body = validBody();
        delete body.discount;
        delete body.taxRate;

        const res = await request(app).post('/api/sales').send(body);

        expect(res.status).toBe(201);
        expect(res.body.discount).toEqual({ type: 'fixed', value: 0 });
        expect(res.body.tax).toBe(0);
        expect(res.body.grandTotal).toBe(200);
    });

    test('paymentStatus is left out when not sent (schema default Pending applies)', async () => {
        const body = validBody();
        delete body.paymentStatus;

        const res = await request(app).post('/api/sales').send(body);

        expect(res.status).toBe(201);
        expect(res.body.paymentStatus).toBeUndefined();
    });

    test('decreases stock for every item', async () => {
        const body = validBody();
        body.items = [
            { product: PRODUCT_ID, quantity: 2 },
            { product: PRODUCT_ID_2, quantity: 3 },
        ];

        const res = await request(app).post('/api/sales').send(body);

        expect(res.status).toBe(201);
        expect(res.body.subtotal).toBe(350); // 200 + 150
        expect(mockDecreaseStock).toHaveBeenCalledTimes(2);
        expect(mockDecreaseStock).toHaveBeenCalledWith(PRODUCT_ID, 2);
        expect(mockDecreaseStock).toHaveBeenCalledWith(PRODUCT_ID_2, 3);
    });

    test('stock is decreased BEFORE the sale is saved', async () => {
        await request(app).post('/api/sales').send(validBody());

        const stockOrder = mockDecreaseStock.mock.invocationCallOrder[0];
        const saveOrder = mockSale.create.mock.invocationCallOrder[0];
        expect(stockOrder).toBeLessThan(saveOrder);
    });

    test('400 when stock is not enough (Harsha checkStock), nothing is saved or decreased', async () => {
        products[PRODUCT_ID] = { ...products[PRODUCT_ID], stock: 1 };
        try {
            const res = await request(app).post('/api/sales').send(validBody());

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Insufficient stock for Pen/);
            expect(mockDecreaseStock).not.toHaveBeenCalled();
            expect(mockSale.create).not.toHaveBeenCalled();
        } finally {
            products[PRODUCT_ID] = { ...products[PRODUCT_ID], stock: 50 };
        }
    });

    test('404 when a product does not exist', async () => {
        const body = validBody();
        body.items = [{ product: '665f1a2b3c4d5e6f7a8b9c99', quantity: 1 }];

        const res = await request(app).post('/api/sales').send(body);

        expect(res.status).toBe(404);
        expect(mockSale.create).not.toHaveBeenCalled();
    });

    test('400 when discount is more than the subtotal, no stock is touched', async () => {
        const body = validBody();
        body.discount = { type: 'fixed', value: 500 };

        const res = await request(app).post('/api/sales').send(body);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Discount cannot exceed/);
        expect(mockDecreaseStock).not.toHaveBeenCalled();
        expect(mockSale.create).not.toHaveBeenCalled();
    });

    test.each([
        ['missing customer', { customer: undefined }],
        ['invalid customer id', { customer: 'abc' }],
        ['missing paymentMethod', { paymentMethod: undefined }],
        ['wrong paymentMethod', { paymentMethod: 'Bitcoin' }],
        ['wrong paymentStatus', { paymentStatus: 'Done' }],
        ['wrong discount type', { discount: { type: 'half', value: 5 } }],
        ['negative discount value', { discount: { type: 'fixed', value: -5 } }],
        ['discount that is not an object', { discount: 10 }],
        ['negative taxRate', { taxRate: -1 }],
        ['taxRate as a string', { taxRate: '18' }],
        ['missing items', { items: undefined }],
        ['empty items', { items: [] }],
    ])('400 for %s', async (_name, override) => {
        const res = await request(app)
            .post('/api/sales')
            .send({ ...validBody(), ...override });

        expect(res.status).toBe(400);
        expect(mockSale.create).not.toHaveBeenCalled();
        expect(mockDecreaseStock).not.toHaveBeenCalled();
    });

    test('400 when the same product is in two lines (would bypass the stock check)', async () => {
        const body = validBody();
        body.items = [
            { product: PRODUCT_ID, quantity: 30 },
            { product: PRODUCT_ID, quantity: 30 },
        ];

        const res = await request(app).post('/api/sales').send(body);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/more than once/);
        expect(mockGetProduct).not.toHaveBeenCalled();
    });

    test('500 and stock is put back when saving the sale fails', async () => {
        mockSale.create.mockRejectedValue(new Error('DB down'));

        const res = await request(app).post('/api/sales').send(validBody());

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('DB down');
        expect(mockDecreaseStock).toHaveBeenCalledWith(PRODUCT_ID, 2);
        expect(mockIncreaseStock).toHaveBeenCalledWith(PRODUCT_ID, 2);
    });

    test('500 and ONLY the already decreased item is put back when the second decrease fails', async () => {
        mockDecreaseStock.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('Team 2 down'));
        const body = validBody();
        body.items = [
            { product: PRODUCT_ID, quantity: 2 },
            { product: PRODUCT_ID_2, quantity: 3 },
        ];

        const res = await request(app).post('/api/sales').send(body);

        expect(res.status).toBe(500);
        expect(mockIncreaseStock).toHaveBeenCalledTimes(1);
        expect(mockIncreaseStock).toHaveBeenCalledWith(PRODUCT_ID, 2);
        expect(mockSale.create).not.toHaveBeenCalled();
    });

    test('still answers 500 with the original error when the rollback itself fails', async () => {
        mockSale.create.mockRejectedValue(new Error('DB down'));
        mockIncreaseStock.mockRejectedValue(new Error('rollback failed'));
        const logSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const res = await request(app).post('/api/sales').send(validBody());

        expect(res.status).toBe(500);
        expect(res.body.message).toBe('DB down');
        logSpy.mockRestore();
    });
});

describe('GET /api/sales', () => {
    test('lists sales, newest first', async () => {
        const sort = jest.fn().mockResolvedValue([{ _id: SALE_ID }]);
        mockSale.find.mockReturnValue({ sort });

        const res = await request(app).get('/api/sales');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(mockSale.find).toHaveBeenCalledWith({});
        expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    test('applies from, to and customer filters', async () => {
        mockSale.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

        await request(app).get(`/api/sales?from=2026-01-01&to=2026-01-31&customer=${CUSTOMER_ID}`);

        expect(mockSale.find).toHaveBeenCalledWith({
            customer: CUSTOMER_ID,
            createdAt: { $gte: expect.any(Date), $lte: expect.any(Date) },
        });
    });

    test('"to" date includes the whole day', async () => {
        mockSale.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

        await request(app).get('/api/sales?to=2026-01-31');

        const filter = mockSale.find.mock.calls[0][0];
        expect(filter.createdAt.$lte.getHours()).toBe(23);
        expect(filter.createdAt.$lte.getMinutes()).toBe(59);
    });

    test('400 for an invalid customer id', async () => {
        const res = await request(app).get('/api/sales?customer=abc');
        expect(res.status).toBe(400);
        expect(mockSale.find).not.toHaveBeenCalled();
    });

    test.each(['from', 'to'])('400 for an invalid %s date', async (name) => {
        const res = await request(app).get(`/api/sales?${name}=not-a-date`);
        expect(res.status).toBe(400);
        expect(mockSale.find).not.toHaveBeenCalled();
    });

    test('500 when the database fails', async () => {
        mockSale.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('DB down')) });

        const res = await request(app).get('/api/sales');

        expect(res.status).toBe(500);
    });
});

describe('GET /api/sales/:id', () => {
    test('returns one sale', async () => {
        mockSale.findById.mockResolvedValue({ _id: SALE_ID, grandTotal: 212.4 });

        const res = await request(app).get(`/api/sales/${SALE_ID}`);

        expect(res.status).toBe(200);
        expect(res.body.grandTotal).toBe(212.4);
    });

    test('400 for an invalid id', async () => {
        const res = await request(app).get('/api/sales/abc');
        expect(res.status).toBe(400);
    });

    test('404 when not found', async () => {
        mockSale.findById.mockResolvedValue(null);

        const res = await request(app).get(`/api/sales/${SALE_ID}`);

        expect(res.status).toBe(404);
    });
});