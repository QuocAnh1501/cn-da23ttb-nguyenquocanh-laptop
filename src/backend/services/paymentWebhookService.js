const model = require('../models/paymentWebhookModel');

// SePay trả transactionDate theo giờ Việt Nam, không phải giờ máy Node.js.
function parseVietnamDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return null;
    const ms = Date.parse(value.replace(' ', 'T') + '+07:00');
    if (!Number.isFinite(ms)) return null;
    const local = new Date(ms + 7 * 3600000).toISOString().slice(0, 19).replace('T', ' ');
    return local === value ? ms : null;
}

function normalize(payload, env = process.env) {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.transferType !== 'in') return null;
    if (typeof payload.accountNumber !== 'string' || payload.accountNumber !== env.VIETQR_ACCOUNT_NO) return null;
    if (typeof payload.gateway !== 'string' || payload.gateway.trim().toLowerCase() !== String(env.SEPAY_GATEWAY || '').trim().toLowerCase()) return null;
    const id = payload.id;
    const amount = payload.transferAmount;
    const ms = parseVietnamDate(payload.transactionDate);
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(amount) || amount <= 0 || amount > 9999999999999 || ms === null) return null;
    // Khớp nội dung hiện có: LAPTOP DH13. Không nhầm DH1 với DH13.
    // Nếu ngân hàng thay đổi nội dung khiến không khớp, chuyển sang đối soát thủ công.
    const content = typeof payload.content === 'string' ? payload.content : '';
    const ids = [...new Set([...content.matchAll(/\bLAPTOP\s*DH([1-9]\d*)\b/gi)].map(m => m[1]))];
    const candidate = ids.length === 1 ? Number(ids[0]) : null;
    const orderId = Number.isSafeInteger(candidate) && candidate <= 4294967295 ? candidate : null;
    return { id: String(id), amount: String(amount), orderId, epoch: Math.floor(ms / 1000), dateVN: payload.transactionDate };
}

async function processSePay(payload) {
    const transaction = normalize(payload);
    if (!transaction) return 'ignored_invalid_or_other_account';
    return model.recordAndApply(transaction);
}

module.exports = { processSePay, normalize, parseVietnamDate };
