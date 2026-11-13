
const API_URL = "http://localhost:3000/api";

const adminApp = document.getElementById("adminApp");
const adminStatus = document.getElementById("adminStatus");
const productsStatus = document.getElementById("productsStatus");
const productList = document.getElementById("adminProductList");
const searchInput = document.getElementById("adminProductSearch");

let allProducts = [];

function formatPrice(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value));
}

function makeCell(row, content) {
    const cell = document.createElement("td");
    cell.textContent = content;
    row.appendChild(cell);
    return cell;
}

function goToLogin() {
    sessionStorage.removeItem("laptop_token");
    window.location.replace(
        "../login.html?return=admin/products.html"
    );
}

// Kiểm tra JWT và vai trò Admin
async function checkAdmin() {
    const token = sessionStorage.getItem("laptop_token");

    if (!token) {
        goToLogin();
        return false;
    }

    const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        goToLogin();
        return false;
    }

    if (!response.ok) {
        throw new Error("Không xác minh được tài khoản");
    }

    const result = await response.json();
    const user = result.data;

    if (user?.role !== "admin") {
        adminStatus.textContent =
            "Bạn không có quyền truy cập trang quản trị.";
        return false;
    }

    document.getElementById("adminName").textContent =
        user.full_name || "Quản trị viên";

    adminStatus.hidden = true;
    adminApp.hidden = false;

    return true;
}

// Hiển thị danh sách sản phẩm
function renderProducts(products) {
    productList.replaceChildren();

    if (products.length === 0) {
        productsStatus.textContent =
            "Không tìm thấy sản phẩm phù hợp.";
        return;
    }

    productsStatus.textContent =
        `Đang hiển thị ${products.length} sản phẩm.`;

    const localImages = {
        1: "../assets/images/dell-inspiron-15.jpg",
        2: "../assets/images/asus-tuf-f15.jpg"
    };

    for (const product of products) {
        const row = document.createElement("tr");

        makeCell(row, product.id);

        // Tên, hình ảnh và thương hiệu
        const infoCell = document.createElement("td");
        const info = document.createElement("div");
        info.className = "product-info";

        const image = document.createElement("img");
        image.alt = product.name;
        image.src = product.image_url ||
            localImages[product.id] || "";

        image.onerror = () => {
            image.removeAttribute("src");
            image.alt = "Không có ảnh";
        };

        const text = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent = product.name;

        const brand = document.createElement("small");
        brand.textContent = product.brand || "Chưa cập nhật";

        text.append(name, brand);
        info.append(image, text);
        infoCell.appendChild(info);
        row.appendChild(infoCell);

        const price = makeCell(
            row,
            formatPrice(product.price)
        );
        price.className = "price-text";

        makeCell(row, product.stock);

        // Trạng thái tồn kho
        const statusCell = document.createElement("td");
        const status = document.createElement("span");

        const inStock = Number(product.stock) > 0;

        status.className =
            `stock-badge ${inStock ? "stock-ok" : "stock-empty"}`;

        status.textContent =
            inStock ? "Đang bán - Còn hàng" : "Hết hàng";

        statusCell.appendChild(status);
        row.appendChild(statusCell);

        // Cột thao tác
        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "admin-actions";

        // Nút sửa
        const editButton = document.createElement("a");
        editButton.href = `product-form.html?id=${product.id}`;
        editButton.className = "admin-action-edit";
        editButton.textContent = "✏️ Sửa";

        // Nút xóa
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "admin-action-delete";
        deleteButton.textContent = "🗑️ Xóa";

        deleteButton.addEventListener("click", async () => {
            const confirmed = confirm(
                `Bạn muốn ngừng bán ${product.name}?`
            );

            if (!confirmed) return;

            const token = sessionStorage.getItem("laptop_token");

            if (!token) {
                goToLogin();
                return;
            }

            deleteButton.disabled = true;

            try {
                const response = await fetch(
                    `${API_URL}/products/${product.id}`,
                    {
                        method: "DELETE",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (response.status === 401) {
                    goToLogin();
                    return;
                }

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Không thể xóa sản phẩm"
                    );
                }

                await loadProducts();
            } catch (error) {
                alert(error.message);
                deleteButton.disabled = false;
            }
        });

        actions.append(editButton, deleteButton);
        actionCell.appendChild(actions);
        row.appendChild(actionCell);

        productList.appendChild(row);
    }
}

// Lấy dữ liệu laptop từ API
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success === false ||
            !Array.isArray(result.data)) {
            throw new Error("Dữ liệu sản phẩm không hợp lệ");
        }

        allProducts = result.data;

        document.getElementById("totalProducts").textContent =
            allProducts.length;

        document.getElementById("outOfStock").textContent =
            allProducts.filter(
                p => Number(p.stock) === 0
            ).length;

        renderProducts(allProducts);

    } catch (error) {
        productsStatus.textContent =
            `Không tải được sản phẩm: ${error.message}`;
    }
}

// Tìm kiếm theo tên hoặc hãng
searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim().toLowerCase();

    const filtered = allProducts.filter(product => {
        const text = [
            product.name,
            product.brand,
            product.model
        ].filter(Boolean).join(" ").toLowerCase();

        return text.includes(keyword);
    });

    renderProducts(filtered);
});

// Đăng xuất
document.getElementById("adminLogout")
    .addEventListener("click", () => {
        sessionStorage.removeItem("laptop_token");
        window.location.replace("../login.html");
    });

// Khởi động trang Admin
async function initializeAdmin() {
    try {
        const allowed = await checkAdmin();

        if (allowed) {
            await loadProducts();
        }
    } catch (error) {
        adminStatus.textContent =
            `Không thể mở trang Admin: ${error.message}`;
    }
}

initializeAdmin();
