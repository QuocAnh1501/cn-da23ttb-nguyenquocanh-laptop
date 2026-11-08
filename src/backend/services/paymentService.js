
function getBankTransferInfo(order) {
    const bankId = process.env.VIETQR_BANK_ID;
    const accountNo = process.env.VIETQR_ACCOUNT_NO;
    const accountName = process.env.VIETQR_ACCOUNT_NAME;

    if (!bankId || !accountNo || !accountName) {
        const error = new Error("Chưa cấu hình VietQR");
        error.statusCode = 500;
        throw error;
    }

    if (!/^[a-zA-Z0-9]+$/.test(bankId) ||
        !/^[0-9]{6,19}$/.test(accountNo)) {
        const error = new Error("Cấu hình ngân hàng không hợp lệ");
        error.statusCode = 500;
        throw error;
    }

    // Giá trị tiền lấy từ đơn hàng trong database
    const match = String(order.total_amount)
        .match(/^([1-9][0-9]*)(?:\.00)?$/);

    if (!match) {
        const error = new Error("Số tiền không hợp lệ");
        error.statusCode = 500;
        throw error;
    }

    const amount = match[1];

    // Nội dung chuyển khoản riêng cho từng đơn
    const transferNote = `LAPTOP DH${order.id}`;

    const qrUrl = new URL(
        `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png`
    );

    qrUrl.searchParams.set("amount", amount);
    qrUrl.searchParams.set("addInfo", transferNote);
    qrUrl.searchParams.set("accountName", accountName);

    return {
        order_id: order.id,
        payment_status: order.payment_status,
        bank_id: bankId,
        account_no: accountNo,
        account_name: accountName,
        amount,
        transfer_note: transferNote,
        qr_url: qrUrl.toString()
    };
}

module.exports = { getBankTransferInfo };
