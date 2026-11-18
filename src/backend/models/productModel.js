
/* ============================================================
   LAPTOP STORE - PRODUCT MODEL

   Chức năng:
   1. Lấy danh sách sản phẩm
   2. Lấy chi tiết sản phẩm theo ID
   3. Thêm sản phẩm mới
   4. Cập nhật thông tin sản phẩm
   5. Xóa mềm sản phẩm
   6. Quản lý trạng thái sản phẩm mới (is_new)

   Quy ước:
   is_active = 1: Sản phẩm đang kinh doanh
   is_active = 0: Sản phẩm ngừng kinh doanh

   is_new = 1: Hiển thị nhãn MỚI
   is_new = 0: Sản phẩm bình thường
   ============================================================ */

const pool = require("../config/database");


// ============================================================
// 01. LẤY DANH SÁCH SẢN PHẨM ĐANG KINH DOANH
// ============================================================

async function getAll() {

    const [rows] = await pool.query(`
        SELECT
            p.*,
            c.name AS category_name

        FROM products p

        LEFT JOIN categories c
            ON p.category_id = c.id

        WHERE p.is_active = 1

        ORDER BY p.id DESC
    `);

    return rows;
}


// ============================================================
// 02. LẤY CHI TIẾT SẢN PHẨM THEO ID
// ============================================================

async function getById(id) {

    const [rows] = await pool.query(
        `SELECT
            p.*,
            c.name AS category_name

         FROM products p

         LEFT JOIN categories c
            ON p.category_id = c.id

         WHERE p.id = ?
           AND p.is_active = 1`,
        [id]
    );

    return rows[0] || null;
}


// ============================================================
// 03. THÊM SẢN PHẨM MỚI
// ============================================================

async function create(product) {

    // Lấy dữ liệu sản phẩm từ Service
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
        image_url,

        // Mặc định không đánh dấu sản phẩm mới
        is_new = 0
    } = product;

    // Kiểm tra trạng thái sản phẩm mới
    const isNew = Number(is_new);

    if (![0, 1].includes(isNew)) {

        const error = new Error(
            "Trạng thái sản phẩm mới không hợp lệ"
        );

        error.statusCode = 400;

        throw error;
    }

    // Thêm dữ liệu vào MariaDB
    const [result] = await pool.query(
        `INSERT INTO products (
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
            image_url,
            is_new
        )
        VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?
        )`,
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
            image_url ?? null,
            isNew
        ]
    );

    // Trả về sản phẩm vừa tạo
    return getById(result.insertId);
}


// ============================================================
// 04. CẬP NHẬT THÔNG TIN SẢN PHẨM
// ============================================================

async function update(id, product) {

    // Danh sách trường được phép cập nhật
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
        "image_url",

        // Cho phép cập nhật nhãn sản phẩm mới
        "is_new"
    ];

    // Chỉ lấy các trường hợp lệ
    const fields = allowedFields.filter(
        field => Object.prototype.hasOwnProperty.call(
            product,
            field
        )
    );

    // Không có trường nào cần cập nhật
    if (fields.length === 0) {

        const error = new Error(
            "Bạn chưa cung cấp thông tin cần cập nhật"
        );

        error.statusCode = 400;

        throw error;
    }

    // Kiểm tra giá trị is_new nếu có cập nhật
    if (Object.prototype.hasOwnProperty.call(
        product,
        "is_new"
    )) {

        const isNew = Number(product.is_new);

        if (![0, 1].includes(isNew)) {

            const error = new Error(
                "Trạng thái sản phẩm mới phải là 0 hoặc 1"
            );

            error.statusCode = 400;

            throw error;
        }

        product.is_new = isNew;
    }

    // Lấy giá trị tương ứng với các trường
    const values = fields.map(
        field => product[field] ?? null
    );

    // Tạo câu lệnh SET động
    const setClause = fields.map(
        field => `\`${field}\` = ?`
    ).join(", ");

    // Thực hiện cập nhật
    await pool.query(
        `UPDATE products

         SET ${setClause}

         WHERE id = ?
           AND is_active = 1`,
        [
            ...values,
            id
        ]
    );

    // Trả về dữ liệu sau khi cập nhật
    return getById(id);
}


// ============================================================
// 05. XÓA MỀM SẢN PHẨM
// ============================================================

async function softDelete(id) {

    // Chỉ ngừng kinh doanh, không xóa dữ liệu thật
    const [result] = await pool.query(
        `UPDATE products

         SET is_active = 0

         WHERE id = ?
           AND is_active = 1`,
        [id]
    );

    return result.affectedRows > 0;
}


// ============================================================
// 06. XUẤT CÁC HÀM MODEL
// ============================================================

module.exports = {
    getAll,
    getById,
    create,
    update,
    softDelete
};
