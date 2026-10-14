const calculatePaymentStatus = (invoiceAmount, totalPaid) => {
    if (totalPaid <= 0) {
        return {
            status: "PENDING",
            remainingAmount: invoiceAmount
        };
    }

    if (totalPaid >= invoiceAmount) {
        return {
            status: "PAID",
            remainingAmount: 0
        };
    }

    return {
        status: "PARTIALLY_PAID",
        remainingAmount: invoiceAmount - totalPaid
    };
};

module.exports = {
    calculatePaymentStatus
};