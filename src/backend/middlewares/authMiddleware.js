
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

function createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

// Kiểm tra JWT và xác định người dùng
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw createError("Bạn chưa đăng nhập", 401);
        }

        const token = authHeader.slice(7).trim();

        if (!token) {
            throw createError("Token không hợp lệ", 401);
        }

        if (!process.env.JWT_SECRET) {
            throw createError("Máy chủ chưa cấu hình JWT", 500);
        }

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ["HS256"]
            });
        } catch (error) {
            throw createError("Token không hợp lệ hoặc đã hết hạn", 401);
        }

        const userId = Number(decoded.sub);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            throw createError("Token không hợp lệ", 401);
        }

        // Lấy thông tin mới nhất từ database
        const user = await userModel.findById(userId);

        if (!user || Number(user.is_active) !== 1) {
            throw createError("Tài khoản không tồn tại hoặc bị khóa", 401);
        }

        req.user = user;

        next();
    } catch (error) {
        next(error);
    }
}

// Chỉ cho phép quản trị viên
function authorizeAdmin(req, res, next) {
    if (!req.user) {
        return next(createError("Bạn chưa đăng nhập", 401));
    }

    if (req.user.role !== "admin") {
        return next(createError("Bạn không có quyền truy cập", 403));
    }

    next();
}

module.exports = {
    authenticate,
    authorizeAdmin
};
