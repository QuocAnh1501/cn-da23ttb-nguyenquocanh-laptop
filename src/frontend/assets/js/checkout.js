
const API_URL = "http://localhost:3000/api";

const checkoutContent =
    document.getElementById("checkoutContent");
const checkoutStatus =
    document.getElementById("checkoutStatus");
const checkoutForm =
    document.getElementById("checkoutForm");
const placeOrderButton =
    document.getElementById("placeOrderButton");

let currentCart = null;
let submitting = false;

// Khởi tạo chức năng chọn địa chỉ nhận hàng
const checkoutAddressPicker =
    LaptopAddress.setupCheckout();

function formatPrice(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value));
}

function showStatus(message, isError = false) {
    checkoutStatus.textContent = message;
    checkoutStatus.style.color = isError
        ? "#dc2626"
        : "#64748b";
}

function goToLogin() {
    sessionStorage.removeItem("laptop_token");
    window.location.replace(
        "login.html?return=checkout.html"
    );
}

// Gọi RESTful API có xác thực JWT
async function apiRequest(path, options = {}) {
    const token = sessionStorage.getItem("laptop_token");

    if (!token) {
        goToLogin();
        throw new Error("Bạn cần đăng nhập");
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
            result.message || "Yêu cầu không thành công"
        );
    }

    return result.data;
}

// Hiển thị các laptop trong đơn hàng
function renderOrderSummary(cart) {
    const container =
        document.getElementById("checkoutItems");

    container.replaceChildren();

    for (const item of cart.items) {
        const row = document.createElement("div");
        row.className = "checkout-item";

        const name = document.createElement("span");
        name.textContent =
            `${item.name} × ${item.quantity}`;

        const subtotal = document.createElement("strong");
        subtotal.textContent = formatPrice(item.subtotal);

        row.append(name, subtotal);
        container.appendChild(row);
    }

    document.getElementById("checkoutTotal")
        .textContent = formatPrice(cart.total);
}

// Tải giỏ hàng và thông tin khách hàng
async function loadCheckout() {
    try {
        const [cart, user] = await Promise.all([
            apiRequest("/cart"),
            apiRequest("/auth/me")
        ]);

        if (!Array.isArray(cart.items) ||
            cart.items.length === 0) {
            showStatus(
                "Giỏ hàng đang trống. Vui lòng chọn laptop trước."
            );
            return;
        }

        currentCart = cart;

        // Sử dụng thông tin mặc định hoặc địa chỉ khác
        checkoutAddressPicker.setCustomer(user);

        renderOrderSummary(cart);

        checkoutContent.hidden = false;
        showStatus("");

    } catch (error) {
        showStatus(error.message, true);
    }
}

// Gửi đơn hàng đến backend
checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitting || !currentCart) return;

    const receiver_name = document
        .getElementById("receiver_name").value.trim();

    const receiver_phone = document
        .getElementById("receiver_phone").value.trim();

        // Lấy địa chỉ nhận hàng theo lựa chọn của khách
        let shipping_address;

        try {
            shipping_address = checkoutAddressPicker.getValue();
        } catch (error) {
            showStatus(error.message, true);
            return;
        }

    // Lấy phương thức thanh toán khách hàng đã chọn
    const payment_method = checkoutForm
        .querySelector('input[name="payment_method"]:checked')
        ?.value;

    if (!["cod", "bank_transfer"].includes(payment_method)) {
        showStatus("Vui lòng chọn phương thức thanh toán.", true);
        return;
    }

    submitting = true;
    placeOrderButton.disabled = true;
    placeOrderButton.textContent = "Đang đặt hàng...";
    showStatus("");

    try {
        // 1. Tạo đơn hàng - chỉ gọi một lần
        const order = await apiRequest("/orders", {
            method: "POST",
            body: JSON.stringify({
                receiver_name,
                receiver_phone,
                shipping_address,
                payment_method
            })
        });

        // 2. Hiển thị thông báo thành công
        checkoutContent.hidden = true;

        const success = document.getElementById("orderSuccess");
        const successText =
            document.getElementById("orderSuccessText");
        const bankBox =
            document.getElementById("bankTransferBox");

        success.hidden = false;
        bankBox.hidden = true;

        const storedMethod = order.payment_method;

        successText.textContent =
            `Mã đơn hàng: #${order.id}. ` +
            `Tổng tiền: ${formatPrice(order.total_amount)}. ` +
            (storedMethod === "bank_transfer"
                ? "Vui lòng chuyển khoản theo thông tin bên dưới."
                : "Bạn sẽ thanh toán khi nhận hàng.");

        // Phát hiện backend lưu sai phương thức
        if (storedMethod !== payment_method) {
            showStatus(
                "Đơn đã tạo nhưng phương thức thanh toán " +
                "không khớp lựa chọn. Hãy kiểm tra backend.",
                true
            );
            return;
        }

        // 3. Nếu thanh toán COD thì không tạo QR
        if (payment_method === "cod") {
            return;
        }

        // 4. Nếu chuyển khoản thì lấy QR theo mã đơn
        bankBox.hidden = false;

        const qrImage =
            document.getElementById("paymentQrImage");

        const note =
            document.getElementById("paymentTransferNote");

        const qrMessage =
            document.getElementById("paymentQrMessage");

        qrMessage.textContent = "Đang tải mã VietQR...";
        qrImage.hidden = true;

        try {
            const payment = await apiRequest(
                `/orders/${order.id}/payment`
            );

            note.textContent =
                `Số tiền: ${formatPrice(payment.amount)}. ` +
                `Nội dung chuyển khoản: ${payment.transfer_note}`;

            qrImage.onload = () => {
                qrImage.hidden = false;
                qrMessage.textContent =
                    "Quét QR để thực hiện chuyển khoản.";
            };

            qrImage.onerror = () => {
                qrImage.hidden = true;
                qrMessage.textContent =
                    "Không tải được ảnh QR. " +
                    "Vui lòng kiểm tra cấu hình VietQR.";
            };

            qrImage.src = payment.qr_url;

        } catch (qrError) {
            qrMessage.textContent =
                "Đơn hàng đã được tạo nhưng chưa tải được QR. " +
                "Không đặt lại đơn. Vui lòng xem lịch sử đơn hàng.";

            console.error("Lỗi VietQR:", qrError);
        }

    } catch (error) {
        showStatus(
            error.message +
            " Nếu yêu cầu bị mất kết nối, hãy kiểm tra " +
            "lịch sử đơn hàng trước khi thử lại.",
            true
        );
    } finally {
        submitting = false;
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = "Xác nhận đặt hàng";
    }
});

loadCheckout();
