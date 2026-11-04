
const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");

const {
    authenticate,
    authorizeAdmin
} = require("../middlewares/authMiddleware");

// Ai cũng được xem sản phẩm
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// Chỉ Admin được thêm, sửa, xóa
router.post(
    "/",
    authenticate,
    authorizeAdmin,
    productController.createProduct
);

router.put(
    "/:id",
    authenticate,
    authorizeAdmin,
    productController.updateProduct
);

router.delete(
    "/:id",
    authenticate,
    authorizeAdmin,
    productController.deleteProduct
);

module.exports = router;
