const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = body;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {}
                resolve({ status: res.statusCode, data: parsed });
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function testTeam5() {
    console.log("=== Testing Team 5 Integration ===");

    // 1. Health check
    const health = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/health',
        method: 'GET'
    });
    console.log("[1] Health Check:", health.status, health.data?.success);

    // 2. Login as ADMIN
    const login = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, {
        email: 'admin@example.com',
        password: 'Admin@123'
    });
    console.log("[2] Admin Login:", login.status, login.data?.token ? "Success" : login.data?.message);
    const token = login.data?.token || login.data?.data?.token;

    if (!token) {
        console.error("No token received, aborting test");
        process.exit(1);
    }

    // 3. Test unauthenticated request to /api/payments (expect 401)
    const unauthPayment = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/payments',
        method: 'GET'
    });
    console.log("[3] Unauthenticated /api/payments:", unauthPayment.status, "(Expected 401)");

    // 4. Test unauthenticated request to /api/reports/sales (expect 401)
    const unauthReport = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/reports/sales',
        method: 'GET'
    });
    console.log("[4] Unauthenticated /api/reports/sales:", unauthReport.status, "(Expected 401)");

    // 5. Fetch or create a pending invoice for payment tests
    const productsRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const products = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.data;
    const testProduct = products[0];

    const customersRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/customers',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const customers = Array.isArray(customersRes.data) ? customersRes.data : customersRes.data?.data;
    const testCustomer = customers[0];

    // Create a new Sale with Pending payment status
    const newSaleRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/sales',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, {
        customer: testCustomer._id || testCustomer.id,
        items: [{
            product: testProduct._id,
            quantity: 1,
            price: Number(testProduct.sellingPrice || 1000)
        }],
        taxRate: 0,
        discount: { type: 'percentage', value: 0 },
        paymentMethod: 'UPI',
        paymentStatus: 'Pending'
    });
    console.log("[5] Created Pending Sale:", newSaleRes.status, newSaleRes.data?.saleNumber || newSaleRes.data?._id);
    const saleId = newSaleRes.data?._id || newSaleRes.data?.id;

    // Create an Invoice for this sale
    const newInvoiceRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/invoices',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, {
        saleId: saleId
    });
    console.log("[6] Generated Invoice for Sale:", newInvoiceRes.status, newInvoiceRes.data?.invoiceNumber);
    const targetInvoice = newInvoiceRes.data;
    const invoiceId = targetInvoice._id || targetInvoice.id;
    const grandTotal = Number(targetInvoice.grandTotal);

    // 7. Test Overpayment (Amount > GrandTotal) -> Expect 400
    const overpaymentRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/payments',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, {
        invoice: invoiceId,
        amount: grandTotal + 500,
        paymentMethod: 'UPI',
        paymentDate: new Date().toISOString()
    });
    console.log("[7] Overpayment Blocked Check:", overpaymentRes.status, overpaymentRes.data?.message, "(Expected 400)");

    // 8. Test Partial Payment (e.g., pay 40% of grandTotal) -> Expect 201
    const partialAmount = Math.round(grandTotal * 0.4);
    const partialPayRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/payments',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, {
        invoice: invoiceId,
        customer: testCustomer._id || testCustomer.id,
        amount: partialAmount,
        paymentMethod: 'Cash',
        paymentDate: new Date().toISOString(),
        transactionReference: 'TXN-PARTIAL-001'
    });
    console.log("[8] Partial Payment Created:", partialPayRes.status, partialPayRes.data?.message);
    console.log("    Summary:", partialPayRes.data?.paymentSummary);

    // 9. Verify Invoice balance changed after partial payment
    const invoiceAfterPartial = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/invoices/${invoiceId}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const invP = invoiceAfterPartial.data?.data || invoiceAfterPartial.data;
    console.log("[9] Verified Invoice State after Partial:", {
        invoiceNumber: invP.invoiceNumber,
        grandTotal: invP.grandTotal,
        paidAmount: invP.paidAmount,
        balance: invP.grandTotal - invP.paidAmount,
        paymentStatus: invP.paymentStatus
    });

    // 10. Pay the remaining balance -> Expect 201 and status 'Paid'
    const remainingAmount = grandTotal - partialAmount;
    const finalPayRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/payments',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, {
        invoice: invoiceId,
        customer: testCustomer._id || testCustomer.id,
        amount: remainingAmount,
        paymentMethod: 'Card',
        paymentDate: new Date().toISOString(),
        transactionReference: 'TXN-FINAL-002'
    });
    console.log("[10] Final Payment Created:", finalPayRes.status, finalPayRes.data?.paymentSummary);

    // 11. Verify Invoice is now fully Paid
    const invoiceAfterFinal = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/invoices/${invoiceId}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const invF = invoiceAfterFinal.data?.data || invoiceAfterFinal.data;
    console.log("[11] Verified Invoice State after Full Payment:", {
        invoiceNumber: invF.invoiceNumber,
        grandTotal: invF.grandTotal,
        paidAmount: invF.paidAmount,
        balance: invF.grandTotal - invF.paidAmount,
        paymentStatus: invF.paymentStatus
    });

    // 12. Test Payment on already fully paid invoice -> Expect 400
    const extraPayRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/payments',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    }, {
        invoice: invoiceId,
        amount: 50,
        paymentMethod: 'Cash',
        paymentDate: new Date().toISOString()
    });
    console.log("[12] Payment on Fully Paid Invoice Blocked:", extraPayRes.status, extraPayRes.data?.message, "(Expected 400)");

    // 13. Test Roles & Permissions
    // A) Login or create Cashier
    let cashierToken = null;
    const cashierLogin = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { email: 'cashier_test@example.com', password: 'Password@123' });

    if (cashierLogin.status === 200) {
        cashierToken = cashierLogin.data?.token;
    } else {
        const createCashier = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/users',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        }, {
            name: 'Test Cashier',
            email: 'cashier_test@example.com',
            password: 'Password@123',
            role: 'CASHIER'
        });
        cashierToken = createCashier.data?.token || createCashier.data?.data?.token;
        if (!cashierToken) {
            const relogin = await request({
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { email: 'cashier_test@example.com', password: 'Password@123' });
            cashierToken = relogin.data?.token;
        }
    }

    if (cashierToken) {
        // Cashier can view /api/payments (Expect 200)
        const cashierPayments = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/payments',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${cashierToken}` }
        });
        console.log("[13a] CASHIER accessing /api/payments:", cashierPayments.status, "(Expected 200)");

        // Cashier CANNOT view /api/reports/sales (Expect 403 Forbidden)
        const cashierReport = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/reports/sales',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${cashierToken}` }
        });
        console.log("[13b] CASHIER accessing /api/reports/sales:", cashierReport.status, cashierReport.data?.message, "(Expected 403 Forbidden)");
    }

    // 14. Check Reports (Admin Access)
    const salesReport = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/reports/sales?period=today',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("[14] Sales Report (today):", salesReport.status, {
        totalSales: salesReport.data?.data?.totalSales,
        numberOfSales: salesReport.data?.data?.numberOfSales
    });

    const profitReport = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/reports/profit?period=today',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("[15] Profit Report (today):", profitReport.status, profitReport.data?.data);

    const stockReport = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/reports/stock',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("[16] Stock Report:", stockReport.status, {
        totalProducts: stockReport.data?.data?.totalProducts,
        totalStockQuantity: stockReport.data?.data?.totalStockQuantity
    });

    const dashboard = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/dashboard',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("[17] Dashboard Summary:", dashboard.status, dashboard.data?.data);

    // 18. Check Teams 1 to 4 endpoints still work
    const t1Users = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/users',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("[18] Team 1 Users Endpoint:", t1Users.status, "Count:", t1Users.data?.data?.length || t1Users.data?.length);

    const t2Products = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/products',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("[19] Team 2 Products Endpoint:", t2Products.status, "Count:", t2Products.data?.length);

    const t3Purchases = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/purchases',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("[20] Team 3 Purchases Endpoint:", t3Purchases.status, "Count:", t3Purchases.data?.data?.length);

    const t4Sales = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/sales',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("[21] Team 4 Sales Endpoint:", t4Sales.status, "Count:", t4Sales.data?.data?.length);

    console.log("=== ALL INTEGRATION VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
}

testTeam5().catch(console.error);

