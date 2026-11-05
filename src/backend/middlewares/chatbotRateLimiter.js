
const { rateLimit } = require("express-rate-limit");

// Giới hạn 5 tin nhắn mỗi tài khoản trong 15 phút
const chatbotRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    // Giới hạn theo tài khoản đã xác thực
    keyGenerator: (req) => `user:${req.user.id}`,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    statusCode: 429,

    message: {
        success: false,
        message: "Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau 15 phút."
    }
});

module.exports = chatbotRateLimiter;
