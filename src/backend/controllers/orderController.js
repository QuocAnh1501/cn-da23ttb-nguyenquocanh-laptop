
const orderService = require("../services/orderService");

// POST /api/orders
async function createOrder(req, res, next) {
    try {
        const order = await orderService.createOrder(
            req.user.id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Đặt hàng thành công",
            data: order
        });
    } catch (error) {
        next(error);
    }
}

// GET /api/orders/my
async function getMyOrders(req, res, next) {
    try {
        const orders = await orderService.getMyOrders(
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Lấy lịch sử đơn hàng thành công",
            data: orders
        });
    } catch (error) {
        next(error);
    }
}

// GET /api/orders/:id
async function getOrderDetail(req, res, next) {
    try {
        const order = await orderService.getOrderDetail(
            req.params.id,
            req.user
        );

        return res.status(200).json({
            success: true,
            message: "Lấy chi tiết đơn hàng thành công",
            data: order
        });
    } catch (error) {
        next(error);
    }
}

// GET /api/orders/admin/all
async function getAllOrders(req, res, next) {
    try {
        const orders = await orderService.getAllOrders();

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách đơn hàng thành công",
            data: orders
        });
    } catch (error) {
        next(error);
    }
}


async function updateOrderStatus(req, res, next) {
    try {
        const order = await orderService.updateOrderStatus(
            req.params.id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật trạng thái đơn hàng thành công",
            data: order
        });
    } catch (error) {
        next(error);
    }
}

const paymentService = require("../services/paymentService");

async function getOrderPayment(req, res, next) {
    try {
        // Hàm này đã kiểm tra chủ đơn hàng hoặc Admin
        const order = await orderService.getOrderDetail(
            req.params.id,
            req.user
        );

        if (order.payment_method !== "bank_transfer") {
            const error = new Error(
                "Đơn hàng không sử dụng chuyển khoản"
            );
            error.statusCode = 400;
            throw error;
        }

        const payment = paymentService.getBankTransferInfo(order);

        return res.status(200).json({
            success: true,
            message: "Lấy thông tin thanh toán thành công",
            data: payment
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createOrder,
    getMyOrders,
    getOrderDetail,
    getAllOrders,
    updateOrderStatus,
    getOrderPayment
};
