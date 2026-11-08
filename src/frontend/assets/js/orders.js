
const API_URL = "http://localhost:3000/api";

const ordersList = document.getElementById("ordersList");
const ordersStatus = document.getElementById("ordersStatus");

const statusLabels = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao hàng",
    delivered: "Đã giao hàng",
    cancelled: "Đã hủy"
};

function formatPrice(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value));
}

function formatDate(value) {
    if (!value) return "Chưa cập nhật";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Chưa cập nhật"
        : date.toLocaleString("vi-VN");
}

function createText(tag, content, className = "") {
    const element = document.createElement(tag);

    element.textContent = content;
    element.className = className;

    return element;
}

function goToLogin() {
    sessionStorage.removeItem("laptop_token");

    window.location.replace(
        "login.html?return=orders.html"
    );
}

// Gọi API với JWT của khách hàng
async function getData(path) {
    const token = sessionStorage.getItem("laptop_token");

    if (!token) {
        goToLogin();
        throw new Error("Bạn cần đăng nhập");
    }

    const response = await fetch(`${API_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        goToLogin();
        throw new Error("Phiên đăng nhập hết hạn");
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || "Không thể tải dữ liệu"
        );
    }

    return result.data;
}

// Hiển thị chi tiết đơn hàng
async function loadOrderDetail(orderId, detail, button) {
    button.disabled = true;
    button.textContent = "Đang tải...";

    try {
        const order = await getData(`/orders/${orderId}`);

        detail.replaceChildren();

        detail.appendChild(
            createText("h3", "Sản phẩm đã đặt")
        );

        for (const item of order.items || []) {
            const row = document.createElement("div");
            row.className = "order-product";

            row.append(
                createText(
                    "span",
                    `${item.product_name} × ${item.quantity}`
                ),
                createText(
                    "strong",
                    formatPrice(item.subtotal)
                )
            );

            detail.appendChild(row);
        }

        detail.append(
            createText(
                "p",
                `Người nhận: ${order.receiver_name}`
            ),
            createText(
                "p",
                `Số điện thoại: ${order.receiver_phone}`
            ),
            createText(
                "p",
                `Địa chỉ giao hàng: ${order.shipping_address}`
            ),

            createText(
                "p",
                `Phương thức thanh toán: ${
                    order.payment_method === "bank_transfer"
                        ? "Chuyển khoản ngân hàng (VietQR)"
                        : "Thanh toán khi nhận hàng (COD)"
                }`
            ),

            createText(
                "p",
                `Thanh toán: ${
                    order.payment_status === "paid"
                        ? "Đã thanh toán"
                        : "Chưa thanh toán"
                }`
            )
        );

        detail.hidden = false;
        button.textContent = "Ẩn chi tiết";

    } catch (error) {
        detail.replaceChildren(
            createText("p", error.message)
        );

        detail.hidden = false;
        button.textContent = "Thử lại";
    } finally {
        button.disabled = false;
    }
}

async function toggleOrderQr(order, box, button) {
    // Đang mở thì ẩn QR
    if (!box.hidden) {
        box.hidden = true;
        button.textContent = "🏦 Xem mã QR thanh toán";
        return;
    }

    // Mở vùng QR
    box.hidden = false;
    button.textContent = "Ẩn mã QR";

    // Đã tải QR thì không cần gọi API lại
    if (box.dataset.loaded === "true") {
        return;
    }

    button.disabled = true;

    box.replaceChildren(
        createText("p", "Đang tải mã VietQR...")
    );

    try {
        // Lấy QR theo đúng mã đơn hàng
        const payment = await getData(
            `/orders/${order.id}/payment`
        );

        if (!payment?.qr_url) {
            throw new Error("API chưa trả về mã QR");
        }

        const qrUrl = new URL(payment.qr_url);

        if (
            qrUrl.protocol !== "https:" ||
            qrUrl.hostname !== "img.vietqr.io"
        ) {
            throw new Error("Đường dẫn VietQR không hợp lệ");
        }

        // Tạo ảnh QR
        const image = document.createElement("img");
        image.className = "order-qr-image";
        image.alt = `Mã VietQR đơn hàng #${order.id}`;

        // Hiển thị số tiền
        const amount = createText(
            "p",
            `Số tiền: ${formatPrice(payment.amount)}`
        );

        // Hiển thị nội dung chuyển khoản
        const note = createText(
            "p",
            `Nội dung chuyển khoản: ${payment.transfer_note}`
        );

        const message = createText(
            "p",
            "Đang tải ảnh QR..."
        );

        image.onload = () => {
            message.textContent =
                "Quét QR để chuyển khoản. " +
                "Đơn hàng vẫn chờ xác nhận thanh toán.";

            box.dataset.loaded = "true";
        };

        image.onerror = () => {
            message.textContent =
                "Không tải được ảnh VietQR. " +
                "Bạn có thể thử lại sau.";

            image.remove();
        };

        box.replaceChildren(
            amount,
            image,
            note,
            message
        );

        image.src = qrUrl.href;

    } catch (error) {
        box.replaceChildren(
            createText(
                "p",
                `Không tải được QR: ${error.message}. ` +
                "Đơn hàng vẫn tồn tại, không cần đặt lại."
            )
        );
    } finally {
        button.disabled = false;
    }
}

// Hiển thị danh sách đơn hàng
function renderOrders(orders) {
    ordersList.replaceChildren();

    if (orders.length === 0) {
        ordersStatus.textContent =
            "Bạn chưa có đơn hàng nào.";

        return;
    }

    ordersStatus.textContent =
        `Bạn có ${orders.length} đơn hàng.`;

    orders.forEach(order => {
        const card = document.createElement("article");
        card.className = "order-card";

        const header = document.createElement("div");
        header.className = "order-heading";

        const title = createText(
            "h2",
            `Đơn hàng #${order.id}`
        );

        const status = createText(
            "span",
            statusLabels[order.status] || order.status,
            `order-status status-${order.status}`
        );

        header.append(title, status);

        const date = createText(
            "p",
            `Ngày đặt: ${formatDate(order.created_at)}`
        );

        const total = createText(
            "p",
            `Tổng tiền: ${formatPrice(order.total_amount)}`,
            "order-total"
        );

        const button = createText(
            "button",
            "Xem chi tiết",
            "order-detail-button"
        );
        button.type = "button";

        const detail = document.createElement("div");
        detail.className = "order-detail";
        detail.hidden = true;

        button.addEventListener("click", () => {
            if (button.textContent === "Ẩn chi tiết") {
                detail.hidden = true;
                button.textContent = "Xem chi tiết";
                return;
            }

            loadOrderDetail(order.id, detail, button);
        });


        card.append(
            header,
            date,
            total,
            button,
            detail
        );

        // Chỉ hiển thị QR cho đơn chuyển khoản
        // chưa thanh toán và chưa bị hủy
        if (
            order.payment_method === "bank_transfer" &&
            order.payment_status === "unpaid" &&
            order.status !== "cancelled"
        ) {
            const qrButton = createText(
                "button",
                "🏦 Xem mã QR thanh toán",
                "order-qr-button"
            );

            qrButton.type = "button";

            const qrBox = document.createElement("div");
            qrBox.className = "order-payment-box";
            qrBox.hidden = true;

            qrButton.addEventListener("click", () => {
                toggleOrderQr(order, qrBox, qrButton);
            });

            card.append(qrButton, qrBox);
        }

        ordersList.appendChild(card);

    });
}

async function loadOrders() {
    try {
        const orders = await getData("/orders/my");

        renderOrders(
            Array.isArray(orders) ? orders : []
        );
    } catch (error) {
        ordersStatus.textContent = error.message;
        ordersStatus.style.color = "#dc2626";
    }
}

loadOrders();
