
const API_URL = "http://localhost:3000/api";

const adminApp = document.getElementById("adminApp");
const adminStatus = document.getElementById("adminStatus");
const ordersStatus = document.getElementById("ordersStatus");
const tableBody = document.getElementById("ordersTableBody");

const statusLabels = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao",
    delivered: "Đã giao",
    cancelled: "Đã hủy"
};

const nextStatuses = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipping", "cancelled"],
    shipping: ["delivered"],
    delivered: [],
    cancelled: []
};

const actionLabels = {
    confirmed: "Xác nhận đơn",
    shipping: "Bắt đầu giao",
    delivered: "Hoàn thành giao hàng",
    cancelled: "Hủy đơn"
};

function formatPrice(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value));
}

// Định dạng ngày giờ theo múi giờ Việt Nam
function formatDate(value) {
    if (!value) return "Chưa cập nhật";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Chưa cập nhật"
        : date.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh"
        });
}

function createText(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}

function addCell(row, value) {
    const td = createText("td", value);
    row.appendChild(td);
    return td;
}

function createButton(label, className, handler) {
    const button = createText("button", label);
    button.type = "button";
    button.className = className;
    button.addEventListener("click", handler);
    return button;
}

function goToLogin() {
    sessionStorage.removeItem("laptop_token");
    window.location.replace(
        "../login.html?return=admin/orders.html"
    );
}

async function apiRequest(path, options = {}) {
    const token = sessionStorage.getItem("laptop_token");

    if (!token) {
        goToLogin();
        throw new Error("Bạn cần đăng nhập");
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (response.status === 401) {
        goToLogin();
        throw new Error("Phiên đăng nhập hết hạn");
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || `Lỗi HTTP ${response.status}`
        );
    }

    return result.data;
}

// Kiểm tra tài khoản trước khi hiển thị dữ liệu
async function checkAdmin() {
    const user = await apiRequest("/auth/me");

    if (user.role !== "admin") {
        throw new Error("Bạn không có quyền truy cập Admin");
    }

    document.getElementById("adminName").textContent =
        user.full_name || "Quản trị viên";

    adminStatus.hidden = true;
    adminApp.hidden = false;
}

// Xem thông tin giao hàng và sản phẩm đã mua
async function showDetail(orderId, detailRow, detailCell) {
    if (!detailRow.hidden) {
        detailRow.hidden = true;
        return;
    }

    detailRow.hidden = false;
    detailCell.textContent = "Đang tải chi tiết...";

    try {
        const order = await apiRequest(`/orders/${orderId}`);

        detailCell.replaceChildren(
            createText("p", `Người nhận: ${order.receiver_name}`),
            createText("p", `SĐT: ${order.receiver_phone}`),
            createText("p", `Địa chỉ: ${order.shipping_address}`),
            createText("p", "Sản phẩm đã đặt:")
        );

        for (const item of order.items || []) {
            detailCell.appendChild(
                createText(
                    "p",
                    `${item.product_name} × ${item.quantity} — ` +
                    formatPrice(item.subtotal)
                )
            );
        }
    } catch (error) {
        detailCell.textContent = error.message;
    }
}

// Admin xác nhận đã kiểm tra và nhận được tiền
async function confirmPayment(order, button) {
    const confirmed = window.confirm(
        `XÁC NHẬN ĐÃ NHẬN TIỀN\n\n` +
        `Đơn hàng #${order.id}\n` +
        `Số tiền: ${formatPrice(order.total_amount)}\n` +
        `Nội dung: LAPTOP DH${order.id}\n\n` +
        `Chỉ chọn OK khi bạn đã đối chiếu giao dịch ` +
        `thực nhận trong tài khoản ngân hàng.`
    );

    if (!confirmed) return;

    button.disabled = true;

    try {
        await apiRequest(
            `/orders/${order.id}/payment/confirm`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    verified: true
                })
            }
        );

        await loadOrders();
    } catch (error) {
        alert(`Không thể xác nhận thanh toán: ${error.message}`);
        button.disabled = false;
    }
}

// Admin cập nhật trạng thái đơn
async function changeOrderStatus(order, newStatus, button) {
    const confirmed = window.confirm(
        `Chuyển đơn #${order.id} sang "${statusLabels[newStatus]}"?`
    );

    if (!confirmed) return;

    button.disabled = true;

    try {
        await apiRequest(`/orders/${order.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status: newStatus
            })
        });

        await loadOrders();
    } catch (error) {
        alert(`Không thể cập nhật đơn: ${error.message}`);
        button.disabled = false;
    }
}

// Hiển thị toàn bộ đơn hàng trong Admin
function renderOrders(orders) {
    tableBody.replaceChildren();

    ordersStatus.textContent =
        `Có ${orders.length} đơn hàng.`;

    for (const order of orders) {
        const row = document.createElement("tr");

        addCell(row, `#${order.id}`);
        addCell(row, order.full_name || order.receiver_name);
        addCell(row, formatDate(order.created_at));
        addCell(row, formatPrice(order.total_amount));

        addCell(
            row,
            order.payment_method === "bank_transfer"
                ? "VietQR"
                : "COD"
        );

        addCell(
            row,
            order.payment_status === "paid"
                ? "✅ Đã thanh toán"
                : "⏳ Chưa thanh toán"
        );

        addCell(
            row,
            statusLabels[order.status] || order.status
        );

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "admin-orders-actions";

        // Nút xem chi tiết đơn
        const detailRow = document.createElement("tr");
        detailRow.hidden = true;

        const detailCell = document.createElement("td");
        detailCell.colSpan = 8;
        detailCell.className = "admin-order-detail";
        detailRow.appendChild(detailCell);

        actions.appendChild(
            createButton(
                "Chi tiết",
                "admin-orders-btn",
                () => showDetail(order.id, detailRow, detailCell)
            )
        );

        // Chỉ VietQR chưa thanh toán mới có nút xác nhận tiền
        if (
            order.payment_method === "bank_transfer" &&
            order.payment_status === "unpaid" &&
            order.status !== "cancelled"
        ) {
            const paymentButton = createButton(
                "✓ Đã nhận tiền",
                "admin-orders-btn payment-confirm",
                () => confirmPayment(order, paymentButton)
            );

            actions.appendChild(paymentButton);
        }

        // Các thao tác hợp lệ theo trạng thái đơn
        const available = nextStatuses[order.status] || [];

        for (const nextStatus of available) {
            // Đơn VietQR chưa nhận tiền chưa được xác nhận/giao
            if (
                order.payment_method === "bank_transfer" &&
                order.payment_status !== "paid" &&
                nextStatus !== "cancelled"
            ) {
                continue;
            }

            // Chưa có quy trình hoàn tiền cho đơn đã thanh toán
            if (
                order.payment_status === "paid" &&
                nextStatus === "cancelled"
            ) {
                continue;
            }

            const button = createButton(
                actionLabels[nextStatus],
                nextStatus === "cancelled"
                    ? "admin-orders-btn cancel-order"
                    : "admin-orders-btn",
                () => changeOrderStatus(order, nextStatus, button)
            );

            actions.appendChild(button);
        }

        actionCell.appendChild(actions);
        row.appendChild(actionCell);

        tableBody.append(row, detailRow);
    }
}

// Lấy dữ liệu mới nhất từ backend
async function loadOrders() {
    ordersStatus.textContent = "Đang tải đơn hàng...";

    try {
        const orders = await apiRequest("/orders/admin/all");
        renderOrders(Array.isArray(orders) ? orders : []);
    } catch (error) {
        ordersStatus.textContent = error.message;
        ordersStatus.style.color = "#dc2626";
    }
}

document.getElementById("reloadOrders")
    .addEventListener("click", loadOrders);

document.getElementById("adminLogout")
    .addEventListener("click", () => {
        sessionStorage.removeItem("laptop_token");
        window.location.replace("../login.html");
    });

async function initializeAdmin() {
    try {
        await checkAdmin();
        await loadOrders();
    } catch (error) {
        adminStatus.textContent = error.message;
    }
}

initializeAdmin();
