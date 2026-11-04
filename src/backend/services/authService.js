const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");

function createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function register(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw createError("Dữ liệu đăng ký không hợp lệ");
    }

    const { full_name, email, password, phone, address } = data;

    // Kiểm tra họ tên
    if (
        typeof full_name !== "string" ||
        !full_name.trim() ||
        full_name.trim().length > 120
    ) {
        throw createError("Họ tên không hợp lệ");
    }

    // Kiểm tra email
    if (typeof email !== "string") {
        throw createError("Email không hợp lệ");
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
        normalizedEmail.length > 191 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
        throw createError("Email không hợp lệ");
    }

    // Kiểm tra mật khẩu
    if (
        typeof password !== "string" ||
        password.length < 8 ||
        Buffer.byteLength(password, "utf8") > 72
    ) {
        throw createError(
            "Mật khẩu phải có ít nhất 8 ký tự và không vượt quá 72 byte"
        );
    }

    // Kiểm tra thông tin không bắt buộc
    if (phone != null &&
        (typeof phone !== "string" || phone.trim().length > 20)) {
        throw createError("Số điện thoại không hợp lệ");
    }

    if (address != null && typeof address !== "string") {
        throw createError("Địa chỉ không hợp lệ");
    }

    // Kiểm tra email đã đăng ký
    const existingUser = await userModel.findByEmail(normalizedEmail);

    if (existingUser) {
        throw createError("Email đã được sử dụng", 409);
    }

    // Băm mật khẩu trước khi lưu
    const password_hash = await bcrypt.hash(password, 12);

    try {
        return await userModel.createUser({
            full_name: full_name.trim(),
            email: normalizedEmail,
            password_hash,
            phone: phone?.trim() || null,
            address: address?.trim() || null
        });
    } catch (error) {
        // Xử lý trường hợp hai yêu cầu đăng ký trùng email cùng lúc
        if (error.code === "ER_DUP_ENTRY") {
            throw createError("Email đã được sử dụng", 409);
        }

        throw error;
    }
}


async function login(data) {
    if (
        !data ||
        typeof data.email !== "string" ||
        typeof data.password !== "string"
    ) {
        throw createError("Email và mật khẩu không hợp lệ", 400);
    }

    const email = data.email.trim().toLowerCase();
    const password = data.password;

    // Tìm tài khoản
    const user = await userModel.findByEmail(email);

    if (!user) {
        throw createError("Email hoặc mật khẩu không chính xác", 401);
    }

    // Kiểm tra mật khẩu đã băm
    const isMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!isMatch) {
        throw createError("Email hoặc mật khẩu không chính xác", 401);
    }

    // Kiểm tra trạng thái tài khoản
    if (user.is_active !== 1) {
        throw createError("Tài khoản đã bị vô hiệu hóa", 403);
    }

    if (!process.env.JWT_SECRET) {
        throw createError("Máy chủ chưa cấu hình JWT", 500);
    }

    // Tạo JWT có thời hạn 2 giờ
    const token = jwt.sign(
        { sub: String(user.id) },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
    );

    // Không trả về mật khẩu đã băm
    const { password_hash, ...safeUser } = user;

    return {
        token,
        user: safeUser
    };
}


module.exports = {
    register,
    login
};
