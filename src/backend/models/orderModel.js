
const pool = require("../config/database");

// 1. Khóa giỏ hàng của khách hàng khi đặt hàng
async function findCartForUpdate(connection, userId) {
    const [rows] = await connection.query(
        `SELECT id, user_id
         FROM carts
         WHERE user_id = ?
         FOR UPDATE`,
        [userId]
    );

    return rows[0] || null;
}

// 2. Lấy các sản phẩm trong giỏ và khóa các dòng này
async function getCartItemsForUpdate(connection, cartId) {
    const [rows] = await connection.query(
        `SELECT id, product_id, quantity
         FROM cart_items
         WHERE cart_id = ?
         ORDER BY product_id, id
         FOR UPDATE`,
        [cartId]
    );

    return rows;
}

// 3. Lấy thông tin laptop và khóa sản phẩm
async function getProductForUpdate(connection, productId) {
    const [rows] = await connection.query(
        `SELECT id, name, price, stock, is_active
         FROM products
         WHERE id = ?
         FOR UPDATE`,
        [productId]
    );

    return rows[0] || null;
}

// 4. Tạo đơn hàng

async function createOrder(connection, order) {
    const {
        userId,
        receiverName,
        receiverPhone,
        shippingAddress,
        totalAmount,
        paymentMethod
    } = order;

    const [result] = await connection.query(
        `INSERT INTO orders
         (user_id, receiver_name, receiver_phone,
          shipping_address, total_amount, payment_method)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            userId,
            receiverName,
            receiverPhone,
            shippingAddress,
            totalAmount,
            paymentMethod
        ]
    );

    return result.insertId;
}

// 5. Lưu một sản phẩm trong đơn hàng
async function createOrderItem(connection, item) {
    const {
        orderId,
        productId,
        productName,
        quantity,
        unitPrice,
        subtotal
    } = item;

    const [result] = await connection.query(
        `INSERT INTO order_items
         (order_id, product_id, product_name,
          quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
            orderId,
            productId,
            productName,
            quantity,
            unitPrice,
            subtotal
        ]
    );

    return result.insertId;
}

// 6. Trừ tồn kho khi đặt hàng
async function decreaseStock(connection, productId, quantity) {
    const [result] = await connection.query(
        `UPDATE products
         SET stock = stock - ?
         WHERE id = ?
           AND is_active = 1
           AND stock >= ?`,
        [quantity, productId, quantity]
    );

    return result.affectedRows === 1;
}

// 7. Xóa sản phẩm khỏi giỏ sau khi đặt hàng
async function clearCart(connection, cartId) {
    await connection.query(
        "DELETE FROM cart_items WHERE cart_id = ?",
        [cartId]
    );
}

// 8. Lấy thông tin đơn hàng theo ID
async function getOrderById(orderId) {
    const [rows] = await pool.query(
        `SELECT *
         FROM orders
         WHERE id = ?`,
        [orderId]
    );

    return rows[0] || null;
}

// 9. Lấy danh sách laptop thuộc một đơn hàng
async function getOrderItems(orderId) {
    const [rows] = await pool.query(
        `SELECT id, product_id, product_name,
                quantity, unit_price, subtotal
         FROM order_items
         WHERE order_id = ?
         ORDER BY id`,
        [orderId]
    );

    return rows;
}

// 10. Lịch sử đơn hàng của một khách hàng
async function getOrdersByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT *
         FROM orders
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC`,
        [userId]
    );

    return rows;
}

// 11. Admin xem tất cả đơn hàng
async function getAllOrders() {
    const [rows] = await pool.query(
        `SELECT o.*, u.full_name, u.email
         FROM orders o
         JOIN users u ON o.user_id = u.id
         ORDER BY o.created_at DESC, o.id DESC`
    );

    return rows;
}

// 12. Khóa đơn hàng trước khi cập nhật trạng thái
async function getOrderForUpdate(connection, orderId) {
    const [rows] = await connection.query(
        `SELECT *
         FROM orders
         WHERE id = ?
         FOR UPDATE`,
        [orderId]
    );

    return rows[0] || null;
}

// 13. Cập nhật trạng thái và thanh toán
async function updateOrderStatus(
    connection,
    orderId,
    status,
    paymentStatus
) {
    await connection.query(
        `UPDATE orders
         SET status = ?, payment_status = ?
         WHERE id = ?`,
        [status, paymentStatus, orderId]
    );
}

// 14. Hoàn trả tồn kho khi hủy đơn hợp lệ
async function restoreStock(connection, productId, quantity) {
    await connection.query(
        `UPDATE products
         SET stock = stock + ?
         WHERE id = ?`,
        [quantity, productId]
    );
}


async function getOrderItemsForUpdate(connection, orderId) {
    const [rows] = await connection.query(
        `SELECT product_id, quantity
         FROM order_items
         WHERE order_id = ?
         ORDER BY product_id, id
         FOR UPDATE`,
        [orderId]
    );

    return rows;
}


module.exports = {
    findCartForUpdate,
    getCartItemsForUpdate,
    getProductForUpdate,
    createOrder,
    createOrderItem,
    decreaseStock,
    clearCart,
    getOrderById,
    getOrderItems,
    getOrdersByUserId,
    getAllOrders,
    getOrderForUpdate,
    updateOrderStatus,
    restoreStock,
    getOrderItemsForUpdate
};
