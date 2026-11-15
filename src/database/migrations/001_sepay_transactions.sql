-- Chạy trong database dự án đã sao lưu. Không xóa/ghi đè bảng orders.
CREATE TABLE IF NOT EXISTS sepay_transactions (
    sepay_id VARCHAR(24) NOT NULL PRIMARY KEY,
    amount DECIMAL(15,2) NOT NULL,
    bank_time_vn DATETIME NOT NULL COMMENT 'Thời điểm do SePay cung cấp, UTC+7',
    order_id INT UNSIGNED NULL,
    result VARCHAR(40) NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sepay_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
