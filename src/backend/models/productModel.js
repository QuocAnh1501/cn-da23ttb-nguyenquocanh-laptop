
const pool = require("../config/database");

async function getAll() {
    const [rows] = await pool.query(`
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
        ORDER BY p.id DESC
    `);

    return rows;
}

async function getById(id) {
    const [rows] = await pool.query(
        `SELECT p.*, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ? AND p.is_active = 1`,
        [id]
    );

    return rows[0] || null;
}

async function create(product) {
    const {
        category_id,
        name,
        slug,
        brand,
        model,
        description,
        price,
        stock,
        cpu,
        ram,
        storage,
        gpu,
        screen_size,
        image_url
    } = product;

    const [result] = await pool.query(
        `INSERT INTO products (
            category_id, name, slug, brand, model, description,
            price, stock, cpu, ram, storage, gpu, screen_size, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            category_id ?? null,
            name,
            slug,
            brand ?? null,
            model ?? null,
            description ?? null,
            price,
            stock ?? 0,
            cpu ?? null,
            ram ?? null,
            storage ?? null,
            gpu ?? null,
            screen_size ?? null,
            image_url ?? null
        ]
    );

    return getById(result.insertId);
}


async function update(id, product) {
    const allowedFields = [
        "category_id",
        "name",
        "slug",
        "brand",
        "model",
        "description",
        "price",
        "stock",
        "cpu",
        "ram",
        "storage",
        "gpu",
        "screen_size",
        "image_url"
    ];

    const fields = allowedFields.filter(
        field => Object.prototype.hasOwnProperty.call(product, field)
    );

    if (fields.length === 0) {
        const error = new Error("Bạn chưa cung cấp thông tin cần cập nhật");
        error.statusCode = 400;
        throw error;
    }

    const values = fields.map(field => product[field] ?? null);
    const setClause = fields.map(field => `\`${field}\` = ?`).join(", ");

    await pool.query(
        `UPDATE products
         SET ${setClause}
         WHERE id = ? AND is_active = 1`,
        [...values, id]
    );

    return getById(id);
}


async function softDelete(id) {
    const [result] = await pool.query(
        `UPDATE products
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
