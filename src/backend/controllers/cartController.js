
const cartService = require("../services/cartService");

// GET /api/cart
async function getCart(req, res, next) {
    try {
        const cart = await cartService.getMyCart(req.user.id);

        return res.status(200).json({
            success: true,
            message: "Lấy giỏ hàng thành công",
            data: cart
        });
    } catch (error) {
        next(error);
    }
}

// POST /api/cart/items
async function addItem(req, res, next) {
    try {
        const cart = await cartService.addToCart(
            req.user.id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Thêm sản phẩm vào giỏ hàng thành công",
            data: cart
        });
    } catch (error) {
        next(error);
    }
}

// PUT /api/cart/items/:id
async function updateItem(req, res, next) {
    try {
        const cart = await cartService.updateCartItem(
            req.user.id,
            req.params.id,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Cập nhật giỏ hàng thành công",
            data: cart
        });
    } catch (error) {
        next(error);
    }
}

// DELETE /api/cart/items/:id
async function removeItem(req, res, next) {
    try {
        const cart = await cartService.removeCartItem(
            req.user.id,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "Xóa sản phẩm khỏi giỏ hàng thành công",
            data: cart
        });
    } catch (error) {
        next(error);
    }
}

// DELETE /api/cart
async function clearCart(req, res, next) {
    try {
        const cart = await cartService.clearMyCart(req.user.id);

        return res.status(200).json({
            success: true,
            message: "Đã làm trống giỏ hàng",
            data: cart
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart
};
