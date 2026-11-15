const adminModel = require("../models/adminModel");

const HOUR = 3600000;
const DAY = 24 * HOUR;
const VN_OFFSET = 7 * HOUR;
const isoDate = d => d.toISOString().slice(0, 10);
const sqlDate = d => d.toISOString().slice(0, 19).replace("T", " ");

function badRequest(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function getCategories() {
    return adminModel.getCategories();
}

function setCategoryStatus(rawId, data) {
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0 || typeof data?.is_active !== "boolean") {
        throw badRequest("ID hoặc trạng thái danh mục không hợp lệ");
    }
    return adminModel.setCategoryStatus(id, data.is_active);
}

// Dùng UTC như một lịch trung gian để tránh phụ thuộc timezone hệ điều hành.
function buildPeriod(period, anchor) {
    if (typeof period !== "string" || !["day", "month", "quarter", "year"].includes(period)) {
        throw badRequest("Kỳ thống kê phải là day, month, quarter hoặc year");
    }
    if (anchor === undefined) anchor = isoDate(new Date(Date.now() + VN_OFFSET));
    if (typeof anchor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) {
        throw badRequest("Ngày phải có định dạng YYYY-MM-DD");
    }
    const date = new Date(`${anchor}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || isoDate(date) !== anchor || date.getUTCFullYear() < 2000 || date.getUTCFullYear() > 2099) {
        throw badRequest("Ngày thống kê không hợp lệ (2000–2099)");
    }
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const make = m => new Date(Date.UTC(year, m, 1));
    let start, end, format, buckets = [];
    if (period === "day") {
        start = date;
        end = new Date(+date + DAY);
        format = "%Y-%m-%d %H:00";
        buckets = Array.from({ length: 24 }, (_, i) => {
            const t = new Date(+start + i * HOUR);
            return { key: t.toISOString().slice(0, 13).replace("T", " ") + ":00", label: String(i).padStart(2, "0") + ":00" };
        });
    } else if (period === "month") {
        start = make(month);
        end = make(month + 1);
        format = "%Y-%m-%d";
        for (let t = +start; t < +end; t += DAY) {
            const key = isoDate(new Date(t));
            buckets.push({ key, label: key.slice(8, 10) + "/" + key.slice(5, 7) });
        }
    } else {
        const first = period === "quarter" ? Math.floor(month / 3) * 3 : 0;
        const count = period === "quarter" ? 3 : 12;
        start = make(first);
        end = make(first + count);
        format = "%Y-%m";
        for (let i = first; i < first + count; i++) {
            const key = isoDate(make(i)).slice(0, 7);
            buckets.push({ key, label: "Tháng " + (i + 1) });
        }
    }
    return {
        period, anchor, format, buckets,
        from: isoDate(start), to: isoDate(new Date(+end - DAY)),
        startUtc: sqlDate(new Date(+start - VN_OFFSET)),
        endUtc: sqlDate(new Date(+end - VN_OFFSET))
    };
}

// MariaDB DECIMAL được đọc dưới dạng chuỗi; cộng chính xác bằng BigInt.
function toMinor(value) {
    const [whole, fraction = ""] = String(value ?? "0").split(".");
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function fromMinor(value) {
    return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}

async function getRevenue(period = "month", anchor) {
    const config = buildPeriod(period, anchor);
    const rows = await adminModel.getRevenueRows(config);
    const rowMap = new Map(rows.map(row => [row.bucket, row]));
    let total = 0n;
    let paidOrders = 0;
    const buckets = config.buckets.map(bucket => {
        const row = rowMap.get(bucket.key);
        const revenue = toMinor(row?.revenue);
        const count = Number(row?.paid_orders || 0);
        total += revenue;
        paidOrders += count;
        return { ...bucket, revenue: fromMinor(revenue), paid_orders: count };
    });
    return {
        period, anchor: config.anchor, from: config.from, to: config.to,
        timezone: "Asia/Ho_Chi_Minh", basis: "created_at_of_paid_orders",
        total_revenue: fromMinor(total), paid_orders: paidOrders, buckets
    };
}

module.exports = { getCategories, setCategoryStatus, getRevenue, buildPeriod };
