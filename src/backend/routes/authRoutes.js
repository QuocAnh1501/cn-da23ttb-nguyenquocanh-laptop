
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);

// Phải đăng nhập mới truy cập được
router.get("/me", authenticate, authController.me);

module.exports = router;
