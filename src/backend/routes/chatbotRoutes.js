
const express = require("express");
const router = express.Router();

const chatbotController = require("../controllers/chatbotController");
const { authenticate } = require("../middlewares/authMiddleware");
const chatbotRateLimiter = require("../middlewares/chatbotRateLimiter");

// Bắt buộc đăng nhập
router.use(authenticate);

// Giới hạn số tin nhắn gọi Gemini
router.post(
    "/message",
    chatbotRateLimiter,
    chatbotController.sendMessage
);

// Xem lịch sử
router.get("/sessions", chatbotController.getSessions);

router.get(
    "/sessions/:id",
    chatbotController.getSessionDetail
);

// Xóa lịch sử
router.delete(
    "/sessions/:id",
    chatbotController.deleteSession
);

module.exports = router;
