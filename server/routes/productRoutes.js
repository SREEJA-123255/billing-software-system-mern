const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    updateProductStatus,
    deleteProduct
} = require("../controllers/productController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("products"));

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.patch("/:id/status", updateProductStatus);
router.delete("/:id/status", deleteProduct);
router.delete("/:id", deleteProduct);

module.exports = router;

