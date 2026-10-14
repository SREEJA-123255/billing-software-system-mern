import mongoose from 'mongoose'
import Sale from '../model/sale.js'
import Invoice from '../model/invoice.js'
import Return from '../model/return.js'

// validateSync() only checks the schema, so no live database is needed.
const id = () => new mongoose.Types.ObjectId();

describe('Sale schema', () => {
  test('empty items is invalid', () => {
    const sale = new Sale({ customer: id(), items: [], subtotal: 0, tax: 0, grandTotal: 0, paymentMethod: 'Cash' });
    expect(sale.validateSync().errors.items).toBeDefined();
  });

  test('invalid paymentMethod is rejected', () => {
    const sale = new Sale({
      customer: id(),
      items: [{ product: id(), quantity: 1, price: 10, total: 10 }],
      subtotal: 10, tax: 0, grandTotal: 10,
      paymentMethod: 'Bitcoin',
    });
    expect(sale.validateSync().errors.paymentMethod).toBeDefined();
  });

  test('valid sale passes', () => {
    const sale = new Sale({
      customer: id(),
      items: [{ product: id(), quantity: 2, price: 50, total: 100 }],
      subtotal: 100, tax: 0, grandTotal: 100,
      paymentMethod: 'UPI',
    });
    expect(sale.validateSync()).toBeUndefined();
  });
});

describe('Invoice schema', () => {
  test('missing invoiceNumber is invalid', () => {
    const inv = new Invoice({
      sale: id(),
      customerDetails: { name: 'Test' },
      subtotal: 100, grandTotal: 100,
      paymentMethod: 'Cash', paymentStatus: 'Paid',
    });
    expect(inv.validateSync().errors.invoiceNumber).toBeDefined();
  });

  test('valid invoice passes', () => {
    const inv = new Invoice({
      invoiceNumber: 'INV-0001',
      sale: id(),
      customerDetails: { name: 'Test' },
      items: [{ productName: 'Pen', quantity: 1, price: 10, total: 10 }],
      subtotal: 10, grandTotal: 10,
      paymentMethod: 'Cash', paymentStatus: 'Paid',
    });
    expect(inv.validateSync()).toBeUndefined();
  });
});

describe('Return schema', () => {
  test('quantityReturned 0 is invalid', () => {
    const r = new Return({ sale: id(), product: id(), quantityReturned: 0 });
    expect(r.validateSync().errors.quantityReturned).toBeDefined();
  });

  test('status defaults to Completed', () => {
    const r = new Return({ sale: id(), product: id(), quantityReturned: 1 });
    expect(r.status).toBe('Completed');
  });
});
