const pool = require('../config/database');
const orderModel = require('./orderModel');

// Lưu ID duy nhất và cập nhật đơn trong cùng transaction, tránh ghi nhận hai lần.
async function recordAndApply(tx) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        try {
            await connection.execute(
                `INSERT INTO sepay_transactions
                    (sepay_id, amount, bank_time_vn, order_id, result)
                 VALUES (?, ?, ?, ?, 'review')`,
                [tx.id, tx.amount, tx.dateVN, tx.orderId]
            );
        } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY') throw error;
            await connection.rollback();
            return 'duplicate';
        }
        let result = 'no_order_code';
        if (tx.orderId !== null) {
            const [rows] = await connection.execute(
                `SELECT id, total_amount, payment_method, payment_status, status,
                        UNIX_TIMESTAMP(created_at) AS created_epoch
                 FROM orders WHERE id = ? FOR UPDATE`, [tx.orderId]
            );
            const order = rows[0];
            if (!order) result = 'order_not_found';
            else if (order.status === 'cancelled') result = 'cancelled';
            else if (order.payment_method !== 'bank_transfer') result = 'wrong_method';
            else if (order.payment_status !== 'unpaid') result = 'already_paid';
            else if (order.created_epoch == null || Number(order.created_epoch) > tx.epoch) result = 'before_order';
            else {
                // DECIMAL(15,2) của MariaDB là chuỗi. Chỉ chấp nhận đúng số VNĐ.
                const match = String(order.total_amount).match(/^([1-9]\d*)(?:\.00)?$/);
                if (!match || match[1] !== tx.amount) result = 'amount_mismatch';
                else {
                    const updated = await orderModel.markBankTransferPaid(connection, tx.orderId);
                    if (!updated) throw new Error('Không thể cập nhật thanh toán');
                    result = 'paid';
                }
            }
        }
        await connection.execute('UPDATE sepay_transactions SET result = ? WHERE sepay_id = ?', [result, tx.id]);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally { connection.release(); }
}

module.exports = { recordAndApply };
