const mongoose = require("mongoose");
const Invoice = require("../models/invoice");
const Purchase = require("../models/Purchase");
const Expense = require("../models/Expense");
const Product = require("../models/product");

// ===============================
// Date Range Helper
// ===============================
const getDateRange = (period, startDate, endDate) => {
    const now = new Date();
    let start;
    let end = new Date();

    if (period === "today") {
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (period === "week") {
        start = new Date();
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (period === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (period === "custom") {
        if (!startDate || !endDate) {
            return null;
        }

        start = new Date(startDate);
        end = new Date(endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return null;
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else {
        start = new Date(0);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
};

// ===============================
// SALES REPORT (Team 4 Data)
// ===============================
const getSalesReport = async (req, res) => {
    try {
        const { period = "today", startDate, endDate } = req.query;
        const range = getDateRange(period, startDate, endDate);

        if (!range) {
            return res.status(400).json({
                success: false,
                message: "startDate and endDate are required for custom period"
            });
        }

        const invoices = await Invoice.find({
            invoiceDate: { $gte: range.start, $lte: range.end }
        }).lean();

        const totalSales = invoices.reduce(
            (total, inv) => total + (Number(inv.grandTotal) || 0),
            0
        );

        res.status(200).json({
            success: true,
            period,
            data: {
                totalSales,
                numberOfSales: invoices.length,
                invoices: invoices.map((inv) => ({
                    id: inv._id,
                    invoiceNumber: inv.invoiceNumber,
                    date: inv.invoiceDate,
                    customer: inv.customerDetails?.name || "Customer",
                    amount: inv.grandTotal,
                    paymentStatus: inv.paymentStatus
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// PURCHASE REPORT (Team 3 Data)
// ===============================
const getPurchaseReport = async (req, res) => {
    try {
        const { period = "today", startDate, endDate } = req.query;
        const range = getDateRange(period, startDate, endDate);

        if (!range) {
            return res.status(400).json({
                success: false,
                message: "startDate and endDate are required for custom period"
            });
        }

        const purchases = await Purchase.find({
            purchaseDate: { $gte: range.start, $lte: range.end }
        })
            .populate("supplierId", "companyName contactPerson")
            .lean();

        const totalPurchases = purchases.reduce(
            (total, p) => total + (Number(p.totalAmount) || 0),
            0
        );

        res.status(200).json({
            success: true,
            period,
            data: {
                totalPurchases,
                numberOfPurchases: purchases.length,
                purchases: purchases.map((p) => ({
                    id: p._id,
                    purchaseNumber: p.purchaseId || p.purchaseNumber || String(p._id),
                    date: p.purchaseDate,
                    supplier: p.supplierId?.companyName || p.supplierName || "Supplier",
                    amount: p.totalAmount,
                    paymentStatus: p.paymentStatus
                }))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// EXPENSE REPORT (Team 5 Data)
// ===============================
const getExpenseReport = async (req, res) => {
    try {
        const { period = "today", startDate, endDate } = req.query;
        const range = getDateRange(period, startDate, endDate);

        if (!range) {
            return res.status(400).json({
                success: false,
                message: "startDate and endDate are required for custom period"
            });
        }

        const expenses = await Expense.find({
            date: { $gte: range.start, $lte: range.end }
        }).lean();

        const totalExpenses = expenses.reduce(
            (total, e) => total + (Number(e.amount) || 0),
            0
        );

        // Group by category
        const categoryMap = {};
        for (const e of expenses) {
            categoryMap[e.category] = (categoryMap[e.category] || 0) + (Number(e.amount) || 0);
        }

        const expensesByCategory = Object.keys(categoryMap)
            .map((cat) => ({
                _id: cat,
                totalAmount: categoryMap[cat]
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount);

        res.status(200).json({
            success: true,
            period,
            data: {
                totalExpenses,
                expensesByCategory
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// PROFIT REPORT (Team 4 Sales - Team 3 Purchases - Team 5 Expenses)
// ===============================
const getProfitReport = async (req, res) => {
    try {
        const { period = "today", startDate, endDate } = req.query;
        const range = getDateRange(period, startDate, endDate);

        if (!range) {
            return res.status(400).json({
                success: false,
                message: "startDate and endDate are required for custom period"
            });
        }

        // 1. Sales revenue from Team 4 Invoices
        const invoices = await Invoice.find({
            invoiceDate: { $gte: range.start, $lte: range.end }
        }).lean();

        const salesRevenue = invoices.reduce(
            (total, inv) => total + (Number(inv.grandTotal) || 0),
            0
        );

        // 2. Purchase cost from Team 3 Purchases
        const purchases = await Purchase.find({
            purchaseDate: { $gte: range.start, $lte: range.end }
        }).lean();

        const purchaseCost = purchases.reduce(
            (total, p) => total + (Number(p.totalAmount) || 0),
            0
        );

        // 3. Operational expenses from Team 5 Expenses
        const expensesList = await Expense.find({
            date: { $gte: range.start, $lte: range.end }
        }).lean();

        const expenses = expensesList.reduce(
            (total, e) => total + (Number(e.amount) || 0),
            0
        );

        // 4. Calculate Net Profit
        const profit = salesRevenue - purchaseCost - expenses;

        res.status(200).json({
            success: true,
            period,
            data: {
                salesRevenue,
                purchaseCost,
                expenses,
                profit
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// STOCK REPORT (Team 2 Products Data)
// ===============================
const getStockReport = async (req, res) => {
    try {
        const products = await Product.find().lean();

        const totalProducts = products.length;
        const totalStockQuantity = products.reduce(
            (total, p) => total + (Number(p.stockQuantity) || 0),
            0
        );

        const totalStockValue = products.reduce(
            (total, p) =>
                total +
                (Number(p.stockQuantity) || 0) * (Number(p.purchasePrice || p.price) || 0),
            0
        );

        const lowStockProducts = products.filter(
            (p) => Number(p.stockQuantity || 0) <= Number(p.minimumStock || 0)
        );

        res.status(200).json({
            success: true,
            data: {
                totalProducts,
                totalStockQuantity,
                totalStockValue,
                lowStockCount: lowStockProducts.length,
                lowStockProducts: lowStockProducts.map((p) => ({
                    id: p._id,
                    name: p.productName || p.name,
                    sku: p.sku,
                    stockQuantity: p.stockQuantity,
                    minimumStock: p.minimumStock,
                    purchasePrice: p.purchasePrice,
                    sellingPrice: p.sellingPrice || p.price
                }))
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
    getSalesReport,
    getPurchaseReport,
    getExpenseReport,
    getProfitReport,
    getStockReport
};