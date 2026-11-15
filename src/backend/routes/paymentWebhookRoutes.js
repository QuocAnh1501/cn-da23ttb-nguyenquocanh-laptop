const express = require('express');
const crypto = require('node:crypto');
const { processSePay } = require('../services/paymentWebhookService');
const router = express.Router();

// Phải mount router trước express.json() để giữ nguyên bytes ký HMAC.
router.post('/sepay', express.raw({ type: 'application/json', limit: '64kb' }), async (req, res, next) => {
    try {
        const secret = process.env.SEPAY_WEBHOOK_SECRET;
        if (!secret || !process.env.VIETQR_ACCOUNT_NO || !process.env.SEPAY_GATEWAY) {
            return res.status(503).json({ success: false, message: 'Webhook chưa được cấu hình' });
        }
        if (!Buffer.isBuffer(req.body)) {
            return res.status(415).json({ success: false, message: 'Yêu cầu JSON' });
        }
        const timestamp = req.get('X-SePay-Timestamp') || '';
        const signature = req.get('X-SePay-Signature') || '';
        if (!/^\d{1,12}$/.test(timestamp) ||
            Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
            !/^sha256=[0-9a-f]{64}$/i.test(signature)) {
            return res.status(401).json({ success: false });
        }
        const expected = crypto.createHmac('sha256', secret)
            .update(timestamp + '.').update(req.body).digest();
        const actual = Buffer.from(signature.slice(7), 'hex');
        if (!crypto.timingSafeEqual(expected, actual)) {
            return res.status(401).json({ success: false });
        }
        let payload;
        try { payload = JSON.parse(req.body.toString('utf8')); }
        catch { return res.status(400).json({ success: false }); }

        const result = await processSePay(payload);
        // Không ghi nội dung chuyển khoản hay thông tin tài khoản vào terminal.
        console.info('[SePay]', result);
        // Phản hồi cả sự kiện đã xử lý hoặc đã lưu để đối soát; lỗi DB sẽ retry.
        return res.status(200).json({ success: true });
    } catch (error) { next(error); }
});

module.exports = router;
