
const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");

const {
    authenticate,
    authorizeAdmin
} = require("../middlewares/authMiddleware");

// Tất cả API đơn hàng yêu cầu đăng nhập
router.use(authenticate);

// Khách hàng đặt hàng
router.post("/", orderController.createOrder);

// Khách hàng xem lịch sử mua hàng
router.get("/my", orderController.getMyOrders);

// Chỉ Admin xem toàn bộ đơn hàng
router.get(
    "/admin/all",
    authorizeAdmin,
    orderController.getAllOrders
);
// Chỉ Admin được cập nhật trạng thái đơn hàng
router.patch(
    "/:id/status",
    authorizeAdmin,
    orderController.updateOrderStatus
);

// Chủ đơn hàng hoặc Admin xem chi tiết
router.get("/:id", orderController.getOrderDetail);
router.get("/:id/payment", orderController.getOrderPayment);
module.exports = router;
