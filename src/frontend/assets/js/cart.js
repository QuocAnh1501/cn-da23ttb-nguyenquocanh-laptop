
const API_URL = "http://localhost:3000/api";

const cartItems = document.getElementById("cartItems");
const cartStatus = document.getElementById("cartStatus");
const cartSummary = document.getElementById("cartSummary");
const toolbar = document.getElementById("cartSelectionToolbar");
const selectAll = document.getElementById("selectAllCartItems");
const checkoutButton = document.getElementById(
    "checkoutSelectedButton"
);

let cartBusy = false;
let currentItems = [];
let selectedIds = new Set();
let selectionInitialized = false;

// ===========================================
// 1. HÀM HỖ TRỢ
// ===========================================

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
    sessionStorage.removeItem("laptop_token");
    window.location.href = "login.html?return=cart.html";
}

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
        goToLogin();
        throw new Error("Phiên đăng nhập hết hạn");
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || "Thao tác giỏ hàng thất bại"
        );
    }

    return result.data;
}

// ===========================================
// 2. KIỂM TRA SẢN PHẨM ĐỦ ĐIỀU KIỆN MUA
// ===========================================

function canSelect(item) {
    const quantity = Number(item.quantity);
    const stock = Number(item.stock);

    return (
        Number(item.is_active) === 1 &&
        Number.isSafeInteger(quantity) &&
        quantity >= 1 &&
        quantity <= stock
    );
}

// ===========================================
// 3. TÍNH TỔNG CÁC SẢN PHẨM ĐÃ CHỌN
// ===========================================

function getSelectedItems() {
    return currentItems.filter(item =>
        selectedIds.has(Number(item.id)) && canSelect(item)
    );
}

function updateSummary() {
    const selected = getSelectedItems();

    const totalQuantity = selected.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
    );

    const totalPrice = selected.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
    );

    document.getElementById("totalQuantity").textContent =
        totalQuantity;

    document.getElementById("cartTotal").textContent =
        formatPrice(totalPrice);

    checkoutButton.disabled = selected.length === 0;

    const available = currentItems.filter(canSelect);

    selectAll.checked =
        available.length > 0 &&
        available.every(item =>
            selectedIds.has(Number(item.id))
        );

    selectAll.indeterminate =
        selected.length > 0 && !selectAll.checked;

    selectAll.disabled = available.length === 0;
}

// ===========================================
// 4. GỬI YÊU CẦU CẬP NHẬT GIỎ HÀNG
// ===========================================

async function changeCart(path, method, body, message) {
    if (cartBusy) return;

    cartBusy = true;

    try {
        const cart = await cartRequest(path, method, body);

        renderCart(cart);
        showStatus(message);

    } catch (error) {
        showStatus(error.message, true);

    } finally {
        cartBusy = false;
    }
}

// ===========================================
// 5. TẠO GIAO DIỆN CHO TỪNG LAPTOP
// ===========================================

function createCartItem(item) {
    const article = document.createElement("article");
    article.className = "cart-item";

    // Checkbox chọn sản phẩm
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cart-select-input";
    checkbox.checked = selectedIds.has(Number(item.id));
    checkbox.disabled = !canSelect(item);
    checkbox.setAttribute(
        "aria-label",
        `Chọn ${item.name} để thanh toán`
    );

    checkbox.addEventListener("change", () => {
        const id = Number(item.id);

        if (checkbox.checked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }

        updateSummary();
    });

    // Hình ảnh sản phẩm
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

    // Thông tin sản phẩm
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

    // ===========================================
    // 6. NHẬP SỐ LƯỢNG TRỰC TIẾP
    // ===========================================

    const controls = document.createElement("div");
    controls.className = "cart-quantity";

    const currentQuantity = Number(item.quantity);
    const availableStock = Number(item.stock);
    const active = Number(item.is_active) === 1;

    function updateQuantity(nextQuantity) {
        if (cartBusy) return;

        if (
            !Number.isSafeInteger(nextQuantity) ||
            nextQuantity < 1 ||
            nextQuantity > availableStock
        ) {
            quantityInput.value = String(currentQuantity);

            showStatus(
                `Số lượng phải từ 1 đến ${availableStock}.`,
                true
            );
            return;
        }

        if (nextQuantity === currentQuantity) return;

        changeCart(
            `/items/${item.id}`,
            "PUT",
            { quantity: nextQuantity },
            "Đã cập nhật số lượng sản phẩm."
        );
    }

    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.disabled = !active || currentQuantity <= 1;

    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.className = "cart-quantity-input";
    quantityInput.min = "1";
    quantityInput.max = String(availableStock);
    quantityInput.step = "1";
    quantityInput.value = String(currentQuantity);
    quantityInput.disabled = !active || availableStock < 1;

    quantityInput.setAttribute(
        "aria-label",
        `Nhập số lượng ${item.name}`
    );

    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.disabled =
        !active || currentQuantity >= availableStock;

    decrease.addEventListener("click", () => {
        updateQuantity(currentQuantity - 1);
    });

    increase.addEventListener("click", () => {
        updateQuantity(currentQuantity + 1);
    });

    // Khi nhập trực tiếp và nhấn ra ngoài
    quantityInput.addEventListener("change", () => {
        if (cartBusy) {
            quantityInput.value = String(currentQuantity);
            return;
        }

        updateQuantity(Number(quantityInput.value));
    });

    // Nhấn Enter để xác nhận số lượng
    quantityInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            quantityInput.blur();
        }
    });

    controls.append(decrease, quantityInput, increase);

    // ===========================================
    // 7. XÓA SẢN PHẨM KHỎI GIỎ
    // ===========================================

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

    info.append(
        name,
        price,
        stock,
        subtotal,
        controls,
        removeButton
    );

    article.append(checkbox, thumb, info);

    return article;
}

// ===========================================
// 8. HIỂN THỊ GIỎ HÀNG
// ===========================================

function renderCart(cart) {
    cartItems.replaceChildren();

    currentItems = Array.isArray(cart.items)
        ? cart.items
        : [];

    const available = currentItems.filter(canSelect);
    const availableIds = new Set(
        available.map(item => Number(item.id))
    );

    // Mặc định chọn tất cả khi mở giỏ lần đầu
    if (!selectionInitialized) {
        selectedIds = new Set(availableIds);
        selectionInitialized = true;
    } else {
        // Giữ các mục đã tích khi chỉnh sửa số lượng
        selectedIds = new Set(
            [...selectedIds].filter(id =>
                availableIds.has(id)
            )
        );
    }

    if (currentItems.length === 0) {
        cartSummary.hidden = true;
        toolbar.hidden = true;
        selectedIds.clear();
        selectionInitialized = false;

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

    for (const item of currentItems) {
        cartItems.appendChild(createCartItem(item));
    }

    toolbar.hidden = false;
    cartSummary.hidden = false;

    updateSummary();

    showStatus(
        `Giỏ hàng hiện có ${currentItems.length} loại sản phẩm.`
    );
}

// ===========================================
// 9. CHỌN TẤT CẢ / BỎ CHỌN TẤT CẢ
// ===========================================

selectAll.addEventListener("change", () => {
    selectedIds = selectAll.checked
        ? new Set(
            currentItems
                .filter(canSelect)
                .map(item => Number(item.id))
        )
        : new Set();

    // Cập nhật lại checkbox của từng sản phẩm
    const checkboxes = cartItems.querySelectorAll(
        ".cart-select-input"
    );

    checkboxes.forEach((checkbox, index) => {
        checkbox.checked = selectedIds.has(
            Number(currentItems[index].id)
        );
    });

    updateSummary();
});

// ===========================================
// 10. CHUYỂN SANG THANH TOÁN
// ===========================================

checkoutButton.addEventListener("click", () => {
    const items = getSelectedItems();

    if (items.length === 0) {
        showStatus(
            "Vui lòng chọn ít nhất một sản phẩm để thanh toán.",
            true
        );
        return;
    }

    // Chỉ lưu ID dòng giỏ hàng đã chọn
    const itemIds = items.map(item => Number(item.id));

    sessionStorage.setItem(
        "laptop_checkout_item_ids",
        JSON.stringify(itemIds)
    );

    window.location.assign("checkout.html");
});

// ===========================================
// 11. XÓA TOÀN BỘ GIỎ HÀNG
// ===========================================

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

// ===========================================
// 12. TẢI DỮ LIỆU
// ===========================================

async function loadCart() {
    try {
        const cart = await cartRequest();
        renderCart(cart);
    } catch (error) {
        showStatus(error.message, true);
    }
}

loadCart();
