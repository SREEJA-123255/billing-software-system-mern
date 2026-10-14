const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    createCustomer,
    getCustomers,
    getCustomerById,
    updateCustomer,
    toggleCustomerStatus,
    deleteCustomer
} = require("../controllers/customerController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("customers"));

router.post("/", createCustomer);
router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.put("/:id", updateCustomer);
router.patch("/:id/status", toggleCustomerStatus);
router.delete("/:id", deleteCustomer);

module.exports = router;