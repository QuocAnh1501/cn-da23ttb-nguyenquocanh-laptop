
const pool = require("../config/database");

// Lấy danh sách danh mục đang hoạt động
async function getAll() {
    const [rows] = await pool.query(
        `SELECT id, name, description, is_active, created_at, updated_at
         FROM categories
         WHERE is_active = 1
         ORDER BY id DESC`
    );

    return rows;
}

// Lấy một danh mục theo ID
async function getById(id) {
    const [rows] = await pool.query(
        `SELECT id, name, description, is_active, created_at, updated_at
         FROM categories
         WHERE id = ? AND is_active = 1`,
        [id]
    );

    return rows[0] || null;
}

// Thêm danh mục
async function create(category) {
    const { name, description = null } = category;

    const [result] = await pool.query(
        `INSERT INTO categories (name, description)
         VALUES (?, ?)`,
        [name, description]
    );

    return getById(result.insertId);
}

// Cập nhật danh mục
async function update(id, category) {
    const fields = [];
    const values = [];

    if (Object.hasOwn(category, "name")) {
        fields.push("name = ?");
        values.push(category.name);
    }

    if (Object.hasOwn(category, "description")) {
        fields.push("description = ?");
        values.push(category.description);
    }

    if (fields.length === 0) {
        return getById(id);
    }

    values.push(id);

    await pool.query(
        `UPDATE categories
         SET ${fields.join(", ")}
         WHERE id = ? AND is_active = 1`,
        values
    );

    return getById(id);
}

// Xóa mềm danh mục
async function softDelete(id) {
    const [result] = await pool.query(
        `UPDATE categories
         SET is_active = 0
         WHERE id = ? AND is_active = 1`,
        [id]
    );

    return result.affectedRows > 0;
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    softDelete
};
