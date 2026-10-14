const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    toggleSupplierStatus,
    deleteSupplier
} = require("../controllers/supplierController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("suppliers"));

router.post("/", createSupplier);
router.get("/", getSuppliers);
router.get("/:id", getSupplierById);
router.put("/:id", updateSupplier);
router.patch("/:id/status", toggleSupplierStatus);
router.delete("/:id", deleteSupplier);

module.exports = router;