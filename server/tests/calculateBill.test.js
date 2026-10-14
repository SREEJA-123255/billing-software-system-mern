import { calculateBill } from '../utils/calculateBill.js'

describe('calculateBill', () => {
  test('no discount, no tax', () => {
    const r = calculateBill({ items: [{ quantity: 2, price: 100 }] });
    expect(r.subtotal).toBe(200);
    expect(r.discountAmount).toBe(0);
    expect(r.taxAmount).toBe(0);
    expect(r.grandTotal).toBe(200);
  });

  test('percentage discount', () => {
    const r = calculateBill({
      items: [{ quantity: 1, price: 1000 }],
      discount: { type: 'percentage', value: 10 },
    });
    expect(r.discountAmount).toBe(100);
    expect(r.grandTotal).toBe(900);
  });

  test('fixed discount', () => {
    const r = calculateBill({
      items: [{ quantity: 1, price: 500 }],
      discount: { type: 'fixed', value: 50 },
    });
    expect(r.discountAmount).toBe(50);
    expect(r.grandTotal).toBe(450);
  });

  test('tax is applied after discount', () => {
    const r = calculateBill({
      items: [{ quantity: 1, price: 1000 }],
      discount: { type: 'percentage', value: 10 },
      taxRate: 18,
    });
    expect(r.taxAmount).toBe(162);
    expect(r.grandTotal).toBe(1062);
  });

  test('multiple items', () => {
    const r = calculateBill({
      items: [
        { quantity: 2, price: 50 },
        { quantity: 3, price: 20 },
      ],
    });
    expect(r.subtotal).toBe(160);
  });

  test('invalid quantity throws', () => {
    expect(() => calculateBill({ items: [{ quantity: 0, price: 100 }] })).toThrow(/Invalid quantity/);
  });

  test('negative price throws', () => {
    expect(() => calculateBill({ items: [{ quantity: 1, price: -5 }] })).toThrow(/Invalid price/);
  });

  test('discount greater than subtotal throws', () => {
    expect(() =>
      calculateBill({
        items: [{ quantity: 1, price: 100 }],
        discount: { type: 'fixed', value: 200 },
      })
    ).toThrow(/Discount cannot exceed/);
  });

  test('percentage over 100 throws', () => {
    expect(() =>
      calculateBill({
        items: [{ quantity: 1, price: 100 }],
        discount: { type: 'percentage', value: 150 },
      })
    ).toThrow(/cannot exceed 100/);
  });

  test('empty items throws', () => {
    expect(() => calculateBill({ items: [] })).toThrow(/At least one item/);
  });
});
