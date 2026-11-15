const pool = require("../config/database");

// Tất cả danh mục, kể cả danh mục đã ngừng sử dụng.
async function getCategories() {
    const [rows] = await pool.query(`
        SELECT c.id, c.name, c.description, c.is_active,
               COUNT(p.id) AS product_count
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id, c.name, c.description, c.is_active
        ORDER BY c.is_active DESC, c.id DESC
    `);
    return rows;
}

// Đổi trạng thái, không xóa dữ liệu hoặc thay đổi ID danh mục.
async function setCategoryStatus(id, active) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [[category]] = await connection.query(
            "SELECT id FROM categories WHERE id = ? FOR UPDATE", [id]
        );
        if (!category) {
            const error = new Error("Không tìm thấy danh mục");
            error.statusCode = 404;
            throw error;
        }
        if (!active) {
            const [[row]] = await connection.query(
                "SELECT COUNT(*) AS total FROM products WHERE category_id = ? AND is_active = 1", [id]
            );
            if (Number(row.total) > 0) {
                const error = new Error("Hãy chuyển các sản phẩm đang bán sang danh mục khác trước");
                error.statusCode = 409;
                throw error;
            }
        }
        await connection.query("UPDATE categories SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
        await connection.commit();
        return { id, is_active: active ? 1 : 0 };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Doanh thu theo NGÀY ĐẶT của đơn đã thanh toán, chưa bị hủy.
// created_at là TIMESTAMP. Dùng phiên UTC riêng, quy đổi sang UTC+7
// để nhóm ngày chính xác mà không phụ thuộc múi giờ Docker/Windows.
async function getRevenueRows({ startUtc, endUtc, format }) {
    const connection = await pool.getConnection();
    let oldZone;
    let changed = false;
    try {
        const [[row]] = await connection.query("SELECT @@session.time_zone AS tz");
        oldZone = row.tz;
        await connection.query("SET SESSION time_zone = '+00:00'");
        changed = true;
        const [rows] = await connection.query(`
            SELECT DATE_FORMAT(DATE_ADD(created_at, INTERVAL 7 HOUR), ?) AS bucket,
                   COUNT(*) AS paid_orders,
                   SUM(total_amount) AS revenue
            FROM orders
            WHERE payment_status = 'paid'
              AND status <> 'cancelled'
              AND created_at >= ? AND created_at < ?
            GROUP BY bucket
            ORDER BY bucket
        `, [format, startUtc, endUtc]);
        return rows;
    } finally {
        // Trả lại múi giờ ban đầu trước khi trả connection vào pool.
        if (changed) {
            try {
                await connection.query("SET SESSION time_zone = ?", [oldZone]);
            } catch (error) {
                connection.destroy();
                throw error;
            }
        }
        connection.release();
    }
}

module.exports = { getCategories, setCategoryStatus, getRevenueRows };
