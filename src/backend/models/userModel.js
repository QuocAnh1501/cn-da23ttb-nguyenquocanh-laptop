
const pool = require("../config/database");

// Tìm tài khoản theo email (dùng cho đăng ký, đăng nhập)
async function findByEmail(email) {
    const [rows] = await pool.query(
        `SELECT id, full_name, email, password_hash,
                phone, address, role, is_active
         FROM users
         WHERE email = ?
         LIMIT 1`,
        [email]
    );

    return rows[0] || null;
}

// Tìm người dùng theo ID, không trả về mật khẩu
async function findById(id) {
    const [rows] = await pool.query(
        `SELECT id, full_name, email, phone, address,
                role, is_active, created_at, updated_at
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows[0] || null;
}

// Tạo tài khoản khách hàng
async function createUser(user) {
    const {
        full_name,
        email,
        password_hash,
        phone = null,
        address = null
    } = user;

    const [result] = await pool.query(
        `INSERT INTO users
         (full_name, email, password_hash, phone, address, role)
         VALUES (?, ?, ?, ?, ?, 'customer')`,
        [
            full_name,
            email,
            password_hash,
            phone,
            address
        ]
    );

    return findById(result.insertId);
}


    async function updateProfile(userId, profile) {
        const { full_name, phone, address } = profile;

        await pool.query(
            `UPDATE users
            SET full_name = ?,
                phone = ?,
                address = ?
            WHERE id = ? AND is_active = 1`,
            [full_name, phone, address, userId]
        );

        return findById(userId);
    }


module.exports = {
    findByEmail,
    findById,
    createUser,
    updateProfile
};
