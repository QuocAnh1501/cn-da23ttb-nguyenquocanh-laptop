const API_ORIGIN = "http://localhost:3000";
const API_URL = `${API_ORIGIN}/api`;
const form = document.getElementById("productForm");
const page = document.getElementById("formPage");
const pageStatus = document.getElementById("formPageStatus");
const message = document.getElementById("formMessage");
const saveButton = document.getElementById("saveProductBtn");
const imageFile = document.getElementById("productImageFile");
const imageUrlInput = document.getElementById("productImageUrl");
const preview = document.getElementById("productImagePreview");
const previewHint = document.getElementById("productImageHint");
const idParam = new URLSearchParams(location.search).get("id");
let editingId = null;
let currentPreviewObjectUrl = null;
let slugEdited = false;

function showMessage(text, isError = false) {
    message.textContent = text;
    message.style.color = isError ? "#dc2626" : "#15803d";
}

function goToLogin() {
    sessionStorage.removeItem("laptop_token");
    location.replace("../login.html?return=admin/products.html");
}

async function api(path, options = {}) {
    const token = sessionStorage.getItem("laptop_token");
    if (!token) {
        goToLogin();
        throw new Error("Bạn cần đăng nhập");
    }
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
    if (response.status === 401) {
        goToLogin();
        throw new Error("Phiên đăng nhập hết hạn");
    }
    const result = await response.json();
    if (!response.ok || result.success === false) {
        throw new Error(result.message || `HTTP ${response.status}`);
    }
    return result.data;
}

function slugify(value) {
    return value.toLowerCase().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function setPreview(url) {
    if (currentPreviewObjectUrl) {
        URL.revokeObjectURL(currentPreviewObjectUrl);
        currentPreviewObjectUrl = null;
    }
    if (!url) {
        preview.hidden = true;
        preview.removeAttribute("src");
        previewHint.hidden = false;
        return;
    }
    preview.onerror = () => {
        preview.hidden = true;
        previewHint.hidden = false;
        previewHint.textContent = "Không tải được ảnh xem trước";
    };
    preview.src = url;
    preview.hidden = false;
    previewHint.hidden = true;
}

imageFile.addEventListener("change", () => {
    if (imageFile.files.length) {
        const file = imageFile.files[0];
        if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) {
            imageFile.value = "";
            showMessage("Chỉ nhận ảnh JPG/PNG/WebP tối đa 5 MB", true);
            return;
        }
        setPreview("");
        currentPreviewObjectUrl = URL.createObjectURL(file);
        preview.src = currentPreviewObjectUrl;
        preview.hidden = false;
        previewHint.hidden = true;
    } else {
        setPreview(imageUrlInput.value.trim());
    }
});

imageUrlInput.addEventListener("change", () => {
    if (!imageFile.files.length) setPreview(imageUrlInput.value.trim());
});

const nameInput = document.getElementById("productName");
const slugInput = document.getElementById("productSlug");
slugInput.addEventListener("input", () => { slugEdited = true; });
nameInput.addEventListener("input", () => {
    if (!slugEdited) slugInput.value = slugify(nameInput.value);
});

async function loadForm() {
    if (idParam && !/^[1-9]\d*$/.test(idParam)) {
        throw new Error("ID sản phẩm không hợp lệ");
    }
    const user = await api("/auth/me");
    if (user.role !== "admin") {
        throw new Error("Bạn không có quyền truy cập trang quản trị");
    }
    const categories = await api("/categories");
    const categorySelect = document.getElementById("productCategory");
    for (const category of categories) {
        const option = document.createElement("option");
        option.value = String(category.id);
        option.textContent = category.name;
        categorySelect.appendChild(option);
    }

    if (idParam) {
        editingId = Number(idParam);
        const product = await api(`/products/${editingId}`);
        document.getElementById("formTitle").textContent = `Sửa laptop #${editingId}`;
        saveButton.textContent = "Cập nhật sản phẩm";
        for (const field of ["name", "slug", "brand", "model", "description", "price", "stock", "cpu", "ram", "storage", "gpu", "screen_size", "image_url", "category_id"]) {
            const input = form.elements.namedItem(field);
            if (input) input.value = product[field] ?? "";
        }
        slugEdited = true;
        setPreview(product.image_url || "");
    }
    pageStatus.hidden = true;
    page.hidden = false;
}

async function uploadImage(file) {
    const data = new FormData();
    data.append("image", file);
    const result = await api("/uploads/products", {
        method: "POST",
        body: data
        // Không tự đặt Content-Type cho FormData
    });
    if (!result?.image_url) throw new Error("API tải ảnh không trả về URL");
    return new URL(result.image_url, API_ORIGIN).href;
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity() || saveButton.disabled) return;
    saveButton.disabled = true;
    showMessage("Đang lưu sản phẩm...");
    try {
        const data = {};
        for (const key of ["name", "slug", "brand", "model", "description", "cpu", "ram", "storage", "gpu", "screen_size"]) {
            data[key] = String(form.elements.namedItem(key).value).trim();
        }
        data.price = Number(form.elements.namedItem("price").value);
        data.stock = Number(form.elements.namedItem("stock").value);
        data.category_id = form.elements.namedItem("category_id").value || null;

        if (!Number.isFinite(data.price) || data.price < 0 ||
            !Number.isSafeInteger(data.stock) || data.stock < 0) {
            throw new Error("Giá bán hoặc tồn kho không hợp lệ");
        }

        if (imageFile.files.length) {
            showMessage("Đang tải ảnh lên máy chủ...");
            data.image_url = await uploadImage(imageFile.files[0]);
        } else {
            const raw = imageUrlInput.value.trim();
            if (raw) {
                const url = new URL(raw);
                if (!["http:", "https:"].includes(url.protocol)) {
                    throw new Error("Link ảnh phải dùng HTTP hoặc HTTPS");
                }
                data.image_url = url.href;
            } else {
                data.image_url = null;
            }
        }
        if (data.image_url && data.image_url.length > 500) {
            throw new Error("Link ảnh dài quá 500 ký tự");
        }
        showMessage("Đang lưu thông tin vào MariaDB...");
        const url = editingId ? `/products/${editingId}` : "/products";
        await api(url, {
            method: editingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        location.assign("products.html");
    } catch (error) {
        showMessage(`Không thể lưu sản phẩm: ${error.message}`, true);
    } finally {
        saveButton.disabled = false;
    }
});

loadForm().catch(error => {
    pageStatus.textContent = `Không thể mở form: ${error.message}`;
});
window.addEventListener("beforeunload", () => {
    if (currentPreviewObjectUrl) URL.revokeObjectURL(currentPreviewObjectUrl);
});
