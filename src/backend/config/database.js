const mysql = require("mysql2/promise");

const pool = mysql.createPool({
host: process.env.DB_HOST || "localhost",
port: Number(process.env.DB_PORT || 3306),
user: process.env.DB_USER || "root",
password: process.env.DB_PASSWORD || "",
database: process.env.DB_NAME || "laptop_store",

// Đọc thời gian từ cơ sở dữ liệu theo UTC
    timezone: "Z",

waitForConnections: true,
connectionLimit: 10,
queueLimit: 0
});

module.exports = pool;