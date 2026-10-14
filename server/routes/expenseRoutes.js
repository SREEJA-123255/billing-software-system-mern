const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense
} = require("../controllers/expenseController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("expenses"));

router.post("/", createExpense);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;