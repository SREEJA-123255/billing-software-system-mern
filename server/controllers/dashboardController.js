const Invoice = require("../models/invoice");
const Purchase = require("../models/Purchase");
const Product = require("../models/product");
const Customer = require("../models/Customer");
const Expense = require("../models/Expense");
const Payment = require("../models/Payment");

// ===============================
// TODAY RANGE
// ===============================
const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return {
        start,
        end
    };
};

// ===============================
// DASHBOARD SUMMARY
// ===============================
const getDashboard = async (req, res) => {
    try {
        const { start, end } = getTodayRange();

        // 1. Today & Total Sales (Team 4)
        const [todayInvoices, allInvoices] = await Promise.all([
            Invoice.find({ invoiceDate: { $gte: start, $lte: end } }).lean(),
            Invoice.find().lean()
        ]);

        const todaySales = todayInvoices.reduce(
            (total, invoice) => total + (Number(invoice.grandTotal) || 0),
            0
        );

        const totalSales = allInvoices.reduce(
            (total, invoice) => total + (Number(invoice.grandTotal) || 0),
            0
        );

        // 2. Purchases (Team 3)
        const allPurchases = await Purchase.find().lean();
        const totalPurchases = allPurchases.reduce(
            (total, purchase) => total + (Number(purchase.totalAmount) || 0),
            0
        );

        // 3. Customers (Team 3)
        const totalCustomers = await Customer.countDocuments();

        // 4. Products & Low Stock (Team 2)
        const allProducts = await Product.find().lean();
        const totalProducts = allProducts.length;
        const lowStockProducts = allProducts.filter((product) => {
            const stockQuantity = Number(product.stockQuantity) || 0;
            const minimumStock = Number(product.minimumStock) || 0;
            return stockQuantity <= minimumStock;
        }).length;

        // 5. Total Expenses (Team 5)
        const allExpenses = await Expense.find().lean();
        const totalExpenses = allExpenses.reduce(
            (total, item) => total + (Number(item.amount) || 0),
            0
        );

        // 6. Pending Payments (Unpaid Invoices balance)
        const pendingPayments = allInvoices
            .filter((inv) => inv.paymentStatus !== "Paid")
            .reduce(
                (total, inv) =>
                    total +
                    Math.max(
                        0,
                        (Number(inv.grandTotal) || 0) - (Number(inv.paidAmount) || 0)
                    ),
                0
            );

        res.status(200).json({
            success: true,
            data: {
                todaySales,
                totalSales,
                totalPurchases,
                totalCustomers,
                totalProducts,
                pendingPayments,
                totalExpenses,
                lowStockProducts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getDashboard
};