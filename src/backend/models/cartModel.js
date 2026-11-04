
const pool = require("../config/database");

// 1. Lấy giỏ hàng của người dùng
async function getCart(userId) {
    const [carts] = await pool.query(
        "SELECT id FROM carts WHERE user_id = ?",
        [userId]
    );

    if (carts.length === 0) {
        return {
            cart_id: null,
            items: [],
            total_quantity: 0,
            total: "0.00"
        };
    }

    const cartId = carts[0].id;

    const [items] = await pool.query(
        `SELECT
            ci.id,
            ci.product_id,
            p.name,
            p.price,
            p.image_url,
            p.stock,
            p.is_active,
            ci.quantity,
            (p.price * ci.quantity) AS subtotal
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = ?
         ORDER BY ci.id DESC`,
        [cartId]
    );

    const [summary] = await pool.query(
        `SELECT
            COALESCE(SUM(ci.quantity), 0) AS total_quantity,
            COALESCE(SUM(p.price * ci.quantity), 0.00) AS total
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = ?`,
        [cartId]
    );

    return {
        cart_id: cartId,
        items,
        total_quantity: Number(summary[0].total_quantity),
        total: summary[0].total
    };
}

// 2. Tạo giỏ hàng nếu chưa tồn tại
async function ensureCart(connection, userId) {
    const [result] = await connection.query(
        `INSERT INTO carts (user_id)
         VALUES (?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [userId]
    );

    return result.insertId;
}

// 3. Khóa giỏ hàng trong transaction
async function lockCart(connection, cartId) {
    const [rows] = await connection.query(
        "SELECT id FROM carts WHERE id = ? FOR UPDATE",
        [cartId]
    );

    return rows[0] || null;
}

// 4. Lấy laptop để kiểm tra trạng thái và tồn kho
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

// 5. Tìm laptop đã có trong giỏ
async function findItem(connection, cartId, productId) {
    const [rows] = await connection.query(
        `SELECT id, product_id, quantity
         FROM cart_items
         WHERE cart_id = ? AND product_id = ?
         FOR UPDATE`,
        [cartId, productId]
    );

    return rows[0] || null;
}

// 6. Tìm một dòng giỏ hàng theo ID
async function findItemById(connection, cartId, itemId) {
    const [rows] = await connection.query(
        `SELECT id, product_id, quantity
         FROM cart_items
         WHERE cart_id = ? AND id = ?
         FOR UPDATE`,
        [cartId, itemId]
    );

    return rows[0] || null;
}

// 7. Thêm laptop vào giỏ
async function addItem(connection, cartId, productId, quantity) {
    const [result] = await connection.query(
        `INSERT INTO cart_items
         (cart_id, product_id, quantity)
         VALUES (?, ?, ?)`,
        [cartId, productId, quantity]
    );

    return result.insertId;
}

// 8. Cập nhật số lượng
async function updateItem(connection, itemId, quantity) {
    await connection.query(
        `UPDATE cart_items
         SET quantity = ?
         WHERE id = ?`,
        [quantity, itemId]
    );
}

// 9. Xóa một sản phẩm khỏi giỏ
async function removeItem(cartId, itemId) {
    const [result] = await pool.query(
        `DELETE FROM cart_items
         WHERE cart_id = ? AND id = ?`,
        [cartId, itemId]
    );

    return result.affectedRows > 0;
}

// 10. Làm trống giỏ hàng
async function clearCart(cartId) {
    await pool.query(
        "DELETE FROM cart_items WHERE cart_id = ?",
        [cartId]
    );
}

// 11. Tìm giỏ hàng theo user ID
async function findCartByUserId(userId) {
    const [rows] = await pool.query(
        "SELECT id, user_id FROM carts WHERE user_id = ?",
        [userId]
    );

    return rows[0] || null;
}

module.exports = {
    getCart,
    ensureCart,
    lockCart,
    getProductForUpdate,
    findItem,
    findItemById,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    findCartByUserId
};
