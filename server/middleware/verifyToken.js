const { authenticate } = require("./authMiddleware");

// Alias verifyToken to Team 1's canonical authenticate middleware
module.exports = authenticate;
