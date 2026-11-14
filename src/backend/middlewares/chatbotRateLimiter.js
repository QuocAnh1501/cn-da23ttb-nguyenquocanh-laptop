
const { rateLimit } = require("express-rate-limit");

// Giới hạn 30 tin nhắn mỗi tài khoản trong 15 phút
const chatbotRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,

    // Giới hạn theo tài khoản đã đăng nhập
    keyGenerator: (req) => `user:${req.user.id}`,

    standardHeaders: "draft-7",
    legacyHeaders: false,

    statusCode: 429,

    // Thông báo khi vượt giới hạn
    message: {
        success: false,
        message:
            "Bạn đã sử dụng hết 30 lượt nhắn tin " +
            "trong 15 phút. Vui lòng thử lại sau."
    }
});

module.exports = chatbotRateLimiter;
