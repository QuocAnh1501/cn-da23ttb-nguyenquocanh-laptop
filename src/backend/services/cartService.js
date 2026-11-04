
const pool = require("../config/database");
const cartModel = require("../models/cartModel");

// Tạo lỗi có mã trạng thái HTTP
function createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

// Kiểm tra ID và số lượng
function validatePositiveInteger(value, fieldName) {
    const number = Number(value);

    if (
        value == null ||
        typeof value === "boolean" ||
        !Number.isSafeInteger(number) ||
        number <= 0 ||
        number > 4294967295
    ) {
        throw createError(`${fieldName} không hợp lệ`, 400);
    }

    return number;
}

// Thực hiện transaction an toàn
async function withTransaction(callback) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const result = await callback(connection);

        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 1. Xem giỏ hàng
async function getMyCart(userId) {
    return cartModel.getCart(userId);
}

// 2. Thêm laptop vào giỏ hàng
async function addToCart(userId, data) {
    const productId = validatePositiveInteger(
        data?.product_id,
        "ID sản phẩm"
    );

    const quantity = validatePositiveInteger(
        data?.quantity ?? 1,
        "Số lượng"
    );

    await withTransaction(async (connection) => {
        // Tạo giỏ hàng nếu chưa có
        const cartId = await cartModel.ensureCart(
            connection,
            userId
        );

        await cartModel.lockCart(connection, cartId);

        // Kiểm tra laptop
        const product = await cartModel.getProductForUpdate(
            connection,
            productId
        );

        if (!product || Number(product.is_active) !== 1) {
            throw createError("Sản phẩm không tồn tại", 404);
        }

        // Kiểm tra sản phẩm đã có trong giỏ chưa
        const existingItem = await cartModel.findItem(
            connection,
            cartId,
            productId
        );

        const currentQuantity = existingItem
            ? Number(existingItem.quantity)
            : 0;

        const newQuantity = currentQuantity + quantity;

        if (newQuantity > Number(product.stock)) {
            throw createError(
                `Không đủ hàng. Hiện còn ${product.stock} sản phẩm`,
                400
            );
        }

        if (existingItem) {
            // Đã có thì cộng thêm số lượng
            await cartModel.updateItem(
                connection,
                existingItem.id,
                newQuantity
            );
        } else {
            // Chưa có thì thêm mới
            await cartModel.addItem(
                connection,
                cartId,
                productId,
                quantity
            );
        }
    });

    return cartModel.getCart(userId);
}

// 3. Cập nhật số lượng laptop
async function updateCartItem(userId, itemId, data) {
    const validItemId = validatePositiveInteger(
        itemId,
        "ID dòng giỏ hàng"
    );

    const quantity = validatePositiveInteger(
        data?.quantity,
        "Số lượng"
    );

    const cart = await cartModel.findCartByUserId(userId);

    if (!cart) {
        throw createError("Không tìm thấy giỏ hàng", 404);
    }

    await withTransaction(async (connection) => {
        await cartModel.lockCart(connection, cart.id);

        const item = await cartModel.findItemById(
            connection,
            cart.id,
            validItemId
        );

        if (!item) {
            throw createError(
                "Không tìm thấy sản phẩm trong giỏ",
                404
            );
        }

        const product = await cartModel.getProductForUpdate(
            connection,
            item.product_id
        );

        if (!product || Number(product.is_active) !== 1) {
            throw createError("Sản phẩm không còn được bán", 400);
        }

        if (quantity > Number(product.stock)) {
            throw createError(
                `Không đủ hàng. Hiện còn ${product.stock} sản phẩm`,
                400
            );
        }

        await cartModel.updateItem(
            connection,
            validItemId,
            quantity
        );
    });

    return cartModel.getCart(userId);
}

// 4. Xóa một laptop khỏi giỏ
async function removeCartItem(userId, itemId) {
    const validItemId = validatePositiveInteger(
        itemId,
        "ID dòng giỏ hàng"
    );

    const cart = await cartModel.findCartByUserId(userId);

    if (!cart) {
        throw createError("Không tìm thấy giỏ hàng", 404);
    }

    const removed = await cartModel.removeItem(
        cart.id,
        validItemId
    );

    if (!removed) {
        throw createError(
            "Không tìm thấy sản phẩm trong giỏ",
            404
        );
    }

    return cartModel.getCart(userId);
}

// 5. Làm trống giỏ hàng
async function clearMyCart(userId) {
    const cart = await cartModel.findCartByUserId(userId);

    if (cart) {
        await cartModel.clearCart(cart.id);
    }

    return cartModel.getCart(userId);
}

module.exports = {
    getMyCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearMyCart
};
