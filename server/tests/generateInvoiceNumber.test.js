import { jest } from '@jest/globals'

const mockCounter = { findOneAndUpdate: jest.fn() };

jest.unstable_mockModule('../model/counter.js', () => ({ default: mockCounter }));

const { generateInvoiceNumber } = await import('../utils/generateInvoiceNumber.js');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('generateInvoiceNumber', () => {
  test('formats the first number as INV-0001', async () => {
    mockCounter.findOneAndUpdate.mockResolvedValue({ seq: 1 });
    expect(await generateInvoiceNumber()).toBe('INV-0001');
  });

  test('pads to 4 digits', async () => {
    mockCounter.findOneAndUpdate.mockResolvedValue({ seq: 42 });
    expect(await generateInvoiceNumber()).toBe('INV-0042');
  });

  test('keeps growing after 9999', async () => {
    mockCounter.findOneAndUpdate.mockResolvedValue({ seq: 12345 });
    expect(await generateInvoiceNumber()).toBe('INV-12345');
  });

  test('uses one atomic increment (upsert, new document returned)', async () => {
    mockCounter.findOneAndUpdate.mockResolvedValue({ seq: 1 });

    await generateInvoiceNumber();

    expect(mockCounter.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mockCounter.findOneAndUpdate).toHaveBeenCalledWith(
      { name: 'invoice' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
  });

  test('two calls give two different numbers', async () => {
    mockCounter.findOneAndUpdate
      .mockResolvedValueOnce({ seq: 7 })
      .mockResolvedValueOnce({ seq: 8 });

    const first = await generateInvoiceNumber();
    const second = await generateInvoiceNumber();

    expect(first).toBe('INV-0007');
    expect(second).toBe('INV-0008');
  });
});
