
const authService = require("../services/authService");

async function register(req, res, next) {
    try {
        const user = await authService.register(req.body);

        return res.status(201).json({
            success: true,
            message: "Đăng ký tài khoản thành công",
            data: user
        });
    } catch (error) {
        next(error);
    }
}


async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);

        return res.status(200).json({
            success: true,
            message: "Đăng nhập thành công",
            data: result
        });
    } catch (error) {
        next(error);
    }
}


async function me(req, res) {
    return res.status(200).json({
        success: true,
        message: "Lấy thông tin tài khoản thành công",
        data: req.user
    });
}


module.exports = {
    register,
    login,
    me
};
