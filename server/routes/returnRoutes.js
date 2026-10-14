const express = require("express");
const { authenticate, authorizeModule } = require("../middleware/authMiddleware");
const {
    createReturn,
    getReturns,
    getReturnById
} = require("../controllers/returnController");

const router = express.Router();

router.use(authenticate);
router.use(authorizeModule("returns"));

router.post("/", createReturn);
router.get("/", getReturns);
router.get("/:id", getReturnById);

module.exports = router;
