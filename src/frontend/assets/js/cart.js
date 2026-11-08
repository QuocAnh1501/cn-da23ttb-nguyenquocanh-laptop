
const API_URL = "http://localhost:3000/api";

const cartItems = document.getElementById("cartItems");
const cartStatus = document.getElementById("cartStatus");
const cartSummary = document.getElementById("cartSummary");

let cartBusy = false;

function formatPrice(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value));
}

function showStatus(message, isError = false) {
    cartStatus.textContent = message;
    cartStatus.style.color = isError
        ? "#dc2626"
        : "#64748b";
}

function goToLogin() {
    window.location.href =
        "login.html?return=cart.html";
}

// Gọi API giỏ hàng kèm JWT
async function cartRequest(path = "", method = "GET", body = null) {
    const token = sessionStorage.getItem("laptop_token");

    if (!token) {
        goToLogin();
        throw new Error("Bạn cần đăng nhập");
    }

    const response = await fetch(`${API_URL}/cart${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (response.status === 401) {
        sessionStorage.removeItem("laptop_token");
        goToLogin();
        throw new Error("Phiên đăng nhập đã hết hạn");
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || "Thao tác giỏ hàng thất bại"
        );
    }

    return result.data;
}

// Gửi yêu cầu thay đổi giỏ hàng
async function changeCart(path, method, body, successMessage) {
    if (cartBusy) return;

    cartBusy = true;

    try {
        const cart = await cartRequest(path, method, body);
        renderCart(cart);
        showStatus(successMessage);
    } catch (error) {
        showStatus(error.message, true);
    } finally {
        cartBusy = false;
    }
}

// Tạo thẻ laptop trong giỏ
function createCartItem(item) {
    const article = document.createElement("article");
    article.className = "cart-item";

    const thumb = document.createElement("div");
    thumb.className = "cart-thumb";

    const localImages = {
        1: "assets/images/dell-inspiron-15.jpg",
        2: "assets/images/asus-tuf-f15.jpg"
    };

    const imageUrl =
        item.image_url || localImages[item.product_id];

    if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = item.name;

        image.onerror = () => {
            thumb.replaceChildren();
            thumb.textContent = "💻";
        };

        thumb.appendChild(image);
    } else {
        thumb.textContent = "💻";
    }

    const info = document.createElement("div");
    info.className = "cart-item-info";

    const name = document.createElement("h3");
    name.textContent = item.name;

    const price = document.createElement("p");
    price.textContent =
        `Đơn giá: ${formatPrice(item.price)}`;

    const stock = document.createElement("p");
    stock.textContent = Number(item.is_active) === 0
        ? "Sản phẩm ngừng kinh doanh"
        : `Trong kho: ${item.stock}`;

    const subtotal = document.createElement("strong");
    subtotal.className = "cart-subtotal";
    subtotal.textContent = formatPrice(item.subtotal);

    // Bộ nút điều chỉnh số lượng
    const controls = document.createElement("div");
    controls.className = "cart-quantity";

    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", "Giảm số lượng");

    const quantity = document.createElement("span");
    quantity.textContent = item.quantity;

    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", "Tăng số lượng");

    const currentQuantity = Number(item.quantity);
    const availableStock = Number(item.stock);

    decrease.disabled = currentQuantity <= 1 ||
        Number(item.is_active) === 0;

    increase.disabled = currentQuantity >= availableStock ||
        Number(item.is_active) === 0;

    decrease.addEventListener("click", () => {
        changeCart(
            `/items/${item.id}`,
            "PUT",
            { quantity: currentQuantity - 1 },
            "Đã cập nhật số lượng."
        );
    });

    increase.addEventListener("click", () => {
        changeCart(
            `/items/${item.id}`,
            "PUT",
            { quantity: currentQuantity + 1 },
            "Đã cập nhật số lượng."
        );
    });

    controls.append(decrease, quantity, increase);

    // Xóa sản phẩm khỏi giỏ
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "cart-remove";
    removeButton.textContent = "Xóa sản phẩm";

    removeButton.addEventListener("click", () => {
        changeCart(
            `/items/${item.id}`,
            "DELETE",
            null,
            "Đã xóa sản phẩm khỏi giỏ hàng."
        );
    });

    info.append(name, price, stock, subtotal,
                controls, removeButton);

    article.append(thumb, info);

    return article;
}

// Hiển thị giỏ hàng
function renderCart(cart) {
    cartItems.replaceChildren();

    const items = Array.isArray(cart.items)
        ? cart.items
        : [];

    if (items.length === 0) {
        cartSummary.hidden = true;

        const empty = document.createElement("div");
        empty.className = "cart-empty";

        const title = document.createElement("h2");
        title.textContent = "Giỏ hàng đang trống";

        const link = document.createElement("a");
        link.href = "index.html#products";
        link.className = "btn-primary";
        link.textContent = "Khám phá laptop";

        empty.append(title, link);
        cartItems.appendChild(empty);

        showStatus("Bạn chưa có sản phẩm trong giỏ.");
        return;
    }

    for (const item of items) {
        cartItems.appendChild(createCartItem(item));
    }

    document.getElementById("totalQuantity").textContent =
        cart.total_quantity;

    document.getElementById("cartTotal").textContent =
        formatPrice(cart.total);

    cartSummary.hidden = false;

    showStatus(
        `Giỏ hàng hiện có ${cart.total_quantity} sản phẩm.`
    );
}

// Tải giỏ hàng từ MariaDB
async function loadCart() {
    try {
        const cart = await cartRequest();
        renderCart(cart);
    } catch (error) {
        showStatus(error.message, true);
    }
}

// Xóa toàn bộ giỏ hàng
document.getElementById("clearCartButton")
    .addEventListener("click", () => {
        if (!window.confirm(
            "Bạn có chắc muốn xóa toàn bộ giỏ hàng?"
        )) {
            return;
        }

        changeCart(
            "",
            "DELETE",
            null,
            "Đã làm trống giỏ hàng."
        );
    });

loadCart();
