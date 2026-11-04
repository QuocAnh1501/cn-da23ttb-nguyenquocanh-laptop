
function errorMiddleware(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || "Lỗi máy chủ";

    if (err.code === "ER_DUP_ENTRY") {
        statusCode = 409;
        message = "Dữ liệu đã tồn tại";
    }

    if (statusCode >= 500) {
        console.error(err);
        message = "Lỗi máy chủ nội bộ";
    }

    return res.status(statusCode).json({
        success: false,
        message
    });
}

module.exports = errorMiddleware;
