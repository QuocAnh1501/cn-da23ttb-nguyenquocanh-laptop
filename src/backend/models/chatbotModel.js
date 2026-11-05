
const pool = require("../config/database");

// 1. Lấy danh sách laptop đang bán và còn hàng
async function getAvailableProducts() {
    const [rows] = await pool.query(
        `SELECT
            p.id,
            p.category_id,
            p.name,
            p.brand,
            p.model,
            p.description,
            p.price,
            p.stock,
            p.cpu,
            p.ram,
            p.storage,
            p.gpu,
            p.screen_size,
            p.image_url,
            c.name AS category_name
         FROM products p
         LEFT JOIN categories c
            ON p.category_id = c.id
         WHERE p.is_active = 1
           AND p.stock > 0
         ORDER BY p.price ASC, p.id ASC
         LIMIT 30`
    );

    return rows;
}

// 2. Tìm laptop phù hợp với ngân sách
async function getProductsByBudget(maxPrice) {
    const [rows] = await pool.query(
        `SELECT
            p.id,
            p.name,
            p.brand,
            p.model,
            p.price,
            p.stock,
            p.cpu,
            p.ram,
            p.storage,
            p.gpu,
            p.description,
            c.name AS category_name
         FROM products p
         LEFT JOIN categories c
            ON p.category_id = c.id
         WHERE p.is_active = 1
           AND p.stock > 0
           AND p.price <= ?
         ORDER BY p.price DESC, p.id ASC
         LIMIT 20`,
        [maxPrice]
    );

    return rows;
}

// 3. Lấy thông tin laptop cụ thể theo ID
async function getProductById(productId) {
    const [rows] = await pool.query(
        `SELECT
            p.id,
            p.name,
            p.brand,
            p.model,
            p.description,
            p.price,
            p.stock,
            p.cpu,
            p.ram,
            p.storage,
            p.gpu,
            p.screen_size,
            p.image_url,
            c.name AS category_name
         FROM products p
         LEFT JOIN categories c
            ON p.category_id = c.id
         WHERE p.id = ?
           AND p.is_active = 1
           AND p.stock > 0`,
        [productId]
    );

    return rows[0] || null;
}


 // 4. Tạo cuộc trò chuyện mới
async function createSession(userId, title) {
    const [result] = await pool.query(
        `INSERT INTO chat_sessions (user_id, title)
         VALUES (?, ?)`,
        [userId, title]
    );

    return result.insertId;
}

// 5. Kiểm tra cuộc trò chuyện thuộc người dùng
async function getSessionById(sessionId, userId) {
    const [rows] = await pool.query(
        `SELECT id, user_id, title, created_at, updated_at
         FROM chat_sessions
         WHERE id = ? AND user_id = ?`,
        [sessionId, userId]
    );

    return rows[0] || null;
}

// 6. Lấy 10 tin nhắn gần nhất theo thứ tự thời gian
async function getRecentMessages(sessionId, userId) {
    const [rows] = await pool.query(
        `SELECT m.id, m.role, m.content
         FROM chat_messages m
         JOIN chat_sessions s ON m.session_id = s.id
         WHERE m.session_id = ? AND s.user_id = ?
         ORDER BY m.id DESC
         LIMIT 10`,
        [sessionId, userId]
    );

    return rows.reverse();
}

// 7. Lưu câu hỏi và câu trả lời trong một transaction
async function saveExchange(
    sessionId,
    userId,
    userMessage,
    assistantMessage
) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Khóa phiên trò chuyện và kiểm tra chủ sở hữu
        const [sessions] = await connection.query(
            `SELECT id FROM chat_sessions
             WHERE id = ? AND user_id = ?
             FOR UPDATE`,
            [sessionId, userId]
        );

        if (sessions.length === 0) {
            const error = new Error(
                "Không tìm thấy cuộc trò chuyện"
            );
            error.statusCode = 404;
            throw error;
        }

        // Lưu câu hỏi của khách hàng
        await connection.query(
            `INSERT INTO chat_messages
             (session_id, role, content)
             VALUES (?, 'user', ?)`,
            [sessionId, userMessage]
        );

        // Lưu câu trả lời của AI
        await connection.query(
            `INSERT INTO chat_messages
             (session_id, role, content)
             VALUES (?, 'assistant', ?)`,
            [sessionId, assistantMessage]
        );

        // Cập nhật thời gian hoạt động của cuộc trò chuyện
        await connection.query(
            `UPDATE chat_sessions
             SET updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [sessionId]
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// 8. Lấy danh sách cuộc trò chuyện của khách hàng
async function getSessionsByUserId(userId) {
    const [rows] = await pool.query(
        `SELECT id, title, created_at, updated_at
         FROM chat_sessions
         WHERE user_id = ?
         ORDER BY updated_at DESC, id DESC
         LIMIT 50`,
        [userId]
    );

    return rows;
}

// 9. Xóa cuộc trò chuyện thuộc người dùng
async function deleteSession(sessionId, userId) {
    const [result] = await pool.query(
        `DELETE FROM chat_sessions
         WHERE id = ? AND user_id = ?`,
        [sessionId, userId]
    );

    return result.affectedRows > 0;
}


 // Lấy tối đa 50 tin nhắn gần nhất của một cuộc trò chuyện
async function getSessionMessages(sessionId, userId) {
    const [rows] = await pool.query(
        `SELECT recent.id,
                recent.role,
                recent.content,
                recent.created_at
         FROM (
             SELECT m.id, m.role, m.content, m.created_at
             FROM chat_messages m
             JOIN chat_sessions s
                 ON m.session_id = s.id
             WHERE m.session_id = ?
               AND s.user_id = ?
             ORDER BY m.id DESC
             LIMIT 50
         ) AS recent
         ORDER BY recent.id ASC`,
        [sessionId, userId]
    );

    return rows;
}


module.exports = {
    getAvailableProducts,
    getProductsByBudget,
    getProductById,
    createSession,
    getSessionById,
    getRecentMessages,
    saveExchange,
    getSessionsByUserId,
    deleteSession,
    getSessionMessages
};