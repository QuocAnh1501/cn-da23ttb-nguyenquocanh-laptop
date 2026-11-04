
const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cartController");

const {
    authenticate
} = require("../middlewares/authMiddleware");

// Tất cả API giỏ hàng đều yêu cầu đăng nhập
router.use(authenticate);

// Xem giỏ hàng
router.get("/", cartController.getCart);

// Thêm sản phẩm
router.post("/items", cartController.addItem);

// Cập nhật số lượng
router.put("/items/:id", cartController.updateItem);

// Xóa một sản phẩm
router.delete("/items/:id", cartController.removeItem);

// Làm trống giỏ hàng
router.delete("/", cartController.clearCart);

module.exports = router;
