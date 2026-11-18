
/* ============================================================
   LAPTOP STORE - ADMIN PRODUCT FORM
   Chức năng:
   01. Kiểm tra quyền Admin
   02. Tạo slug tự động
   03. Tải danh mục sản phẩm
   04. Thêm / sửa laptop
   05. Tải ảnh hoặc sử dụng link ảnh
   06. Đánh dấu sản phẩm mới (Có / Không)
   07. Lưu sản phẩm vào MariaDB qua REST API
   ============================================================ */


// ============================================================
// 01. CẤU HÌNH API VÀ KHAI BÁO PHẦN TỬ
// ============================================================

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

// Trường trạng thái sản phẩm mới
const isNewSelect = document.getElementById("productIsNew");

// Lấy ID sản phẩm khi mở trang sửa
const idParam = new URLSearchParams(
    location.search
).get("id");

let editingId = null;

let currentPreviewObjectUrl = null;

let slugEdited = false;


// ============================================================
// 02. HIỂN THỊ THÔNG BÁO
// ============================================================

function showMessage(text, isError = false) {
    message.textContent = text;

    message.style.color = isError
        ? "#dc2626"
        : "#15803d";
}


// ============================================================
// 03. CHUYỂN VỀ ĐĂNG NHẬP
// ============================================================

function goToLogin() {
    sessionStorage.removeItem("laptop_token");

    location.replace(
        "../login.html?return=admin/products.html"
    );
}


// ============================================================
// 04. HÀM GỌI REST API CÓ JWT
// ============================================================

async function api(path, options = {}) {

    const token = sessionStorage.getItem(
        "laptop_token"
    );

    if (!token) {
        goToLogin();

        throw new Error("Bạn cần đăng nhập");
    }

    const response = await fetch(
        `${API_URL}${path}`,
        {
            ...options,

            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        }
    );

    // Phiên đăng nhập hết hạn
    if (response.status === 401) {
        goToLogin();

        throw new Error(
            "Phiên đăng nhập đã hết hạn"
        );
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
        throw new Error(
            result.message || `HTTP ${response.status}`
        );
    }

    return result.data;
}


// ============================================================
// 05. TẠO SLUG TỰ ĐỘNG TỪ TÊN SẢN PHẨM
// ============================================================

function slugify(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}


// ============================================================
// 06. HIỂN THỊ ẢNH XEM TRƯỚC
// ============================================================

function setPreview(url) {

    // Giải phóng URL ảnh tạm trước đó
    if (currentPreviewObjectUrl) {
        URL.revokeObjectURL(
            currentPreviewObjectUrl
        );

        currentPreviewObjectUrl = null;
    }

    // Chưa có ảnh
    if (!url) {
        preview.hidden = true;
        preview.removeAttribute("src");

        previewHint.hidden = false;
        previewHint.textContent =
            "Chưa có ảnh xem trước";

        return;
    }

    // Trường hợp ảnh không tải được
    preview.onerror = () => {
        preview.hidden = true;

        previewHint.hidden = false;
        previewHint.textContent =
            "Không tải được ảnh xem trước";
    };

    preview.src = url;
    preview.hidden = false;
    previewHint.hidden = true;
}


// ============================================================
// 07. XỬ LÝ ẢNH CHỌN TỪ MÁY TÍNH
// ============================================================

imageFile.addEventListener("change", () => {

    if (imageFile.files.length) {

        const file = imageFile.files[0];

        // Kiểm tra định dạng và kích thước
        const allowedTypes = new Set([
            "image/jpeg",
            "image/png",
            "image/webp"
        ]);

        if (
            !allowedTypes.has(file.type) ||
            file.size > 5 * 1024 * 1024
        ) {
            imageFile.value = "";

            showMessage(
                "Chỉ nhận ảnh JPG, PNG hoặc WebP tối đa 5 MB",
                true
            );

            return;
        }

        // Hiển thị ảnh vừa chọn
        setPreview("");

        currentPreviewObjectUrl =
            URL.createObjectURL(file);

        preview.src = currentPreviewObjectUrl;
        preview.hidden = false;
        previewHint.hidden = true;

    } else {
        setPreview(
            imageUrlInput.value.trim()
        );
    }
});


// ============================================================
// 08. XỬ LÝ ĐƯỜNG LINK ẢNH
// ============================================================

imageUrlInput.addEventListener("change", () => {

    if (!imageFile.files.length) {
        setPreview(
            imageUrlInput.value.trim()
        );
    }
});


// ============================================================
// 09. TẠO SLUG KHI NHẬP TÊN LAPTOP
// ============================================================

const nameInput = document.getElementById(
    "productName"
);

const slugInput = document.getElementById(
    "productSlug"
);

// Nếu Admin sửa slug bằng tay thì giữ nguyên
slugInput.addEventListener("input", () => {
    slugEdited = true;
});

// Tự tạo slug khi nhập tên
nameInput.addEventListener("input", () => {

    if (!slugEdited) {
        slugInput.value = slugify(
            nameInput.value
        );
    }
});


// ============================================================
// 10. TẢI DỮ LIỆU FORM THÊM / SỬA
// ============================================================

async function loadForm() {

    // Kiểm tra ID trong đường dẫn
    if (
        idParam &&
        !/^[1-9]\d*$/.test(idParam)
    ) {
        throw new Error(
            "ID sản phẩm không hợp lệ"
        );
    }

    // Kiểm tra trường sản phẩm mới trong HTML
    if (!isNewSelect) {
        throw new Error(
            "Thiếu ô Sản phẩm mới trong product-form.html"
        );
    }

    // Kiểm tra tài khoản Admin
    const user = await api("/auth/me");

    if (user.role !== "admin") {
        throw new Error(
            "Bạn không có quyền truy cập trang quản trị"
        );
    }

    // --------------------------------------------------------
    // 10.1. Tải danh mục sản phẩm
    // --------------------------------------------------------

    const categories = await api(
        "/categories"
    );

    const categorySelect =
        document.getElementById("productCategory");

    for (const category of categories) {

        const option = document.createElement(
            "option"
        );

        option.value = String(category.id);
        option.textContent = category.name;

        categorySelect.appendChild(option);
    }

    // --------------------------------------------------------
    // 10.2. Mặc định khi thêm mới: Không
    // --------------------------------------------------------

    isNewSelect.value = "0";

    // --------------------------------------------------------
    // 10.3. Nếu có ID thì tải sản phẩm để chỉnh sửa
    // --------------------------------------------------------

    if (idParam) {

        editingId = Number(idParam);

        const product = await api(
            `/products/${editingId}`
        );

        // Thay đổi tiêu đề
        document.getElementById("formTitle")
            .textContent =
            `Sửa laptop #${editingId}`;

        saveButton.textContent =
            "Cập nhật sản phẩm";

        // Danh sách trường cần tự động điền
        const fields = [
            "name",
            "slug",
            "brand",
            "model",
            "description",
            "price",
            "stock",
            "cpu",
            "ram",
            "storage",
            "gpu",
            "screen_size",
            "image_url",
            "category_id",
            "is_new"
        ];

        for (const field of fields) {

            const input =
                form.elements.namedItem(field);

            if (!input) continue;

            // Sản phẩm mới lưu 0 hoặc 1
            if (field === "is_new") {
                input.value = String(
                    product.is_new ?? 0
                );
            } else {
                input.value =
                    product[field] ?? "";
            }
        }

        // Không tự thay slug khi sửa sản phẩm
        slugEdited = true;

        // Hiển thị ảnh hiện tại
        setPreview(
            product.image_url || ""
        );
    }

    // --------------------------------------------------------
    // 10.4. Hiển thị form sau khi tải xong
    // --------------------------------------------------------

    pageStatus.hidden = true;
    page.hidden = false;
}


// ============================================================
// 11. TẢI ẢNH SẢN PHẨM LÊN BACKEND
// ============================================================

async function uploadImage(file) {

    const data = new FormData();

    data.append("image", file);

    const result = await api(
        "/uploads/products",
        {
            method: "POST",
            body: data

            // Không đặt Content-Type cho FormData
        }
    );

    if (!result?.image_url) {
        throw new Error(
            "API tải ảnh không trả về URL"
        );
    }

    return new URL(
        result.image_url,
        API_ORIGIN
    ).href;
}


// ============================================================
// 12. XỬ LÝ LƯU SẢN PHẨM
// ============================================================

form.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (
            !form.reportValidity() ||
            saveButton.disabled
        ) {
            return;
        }

        saveButton.disabled = true;

        showMessage(
            "Đang lưu sản phẩm..."
        );

        try {

            // ------------------------------------------------
            // 12.1. Lấy dữ liệu từ các ô nhập
            // ------------------------------------------------

            const data = {};

            const textFields = [
                "name",
                "slug",
                "brand",
                "model",
                "description",
                "cpu",
                "ram",
                "storage",
                "gpu",
                "screen_size"
            ];

            for (const key of textFields) {
                data[key] = String(
                    form.elements.namedItem(key).value
                ).trim();
            }

            // ------------------------------------------------
            // 12.2. Giá bán và tồn kho
            // ------------------------------------------------

            data.price = Number(
                form.elements.namedItem("price").value
            );

            data.stock = Number(
                form.elements.namedItem("stock").value
            );

            // ------------------------------------------------
            // 12.3. Danh mục sản phẩm
            // ------------------------------------------------

            data.category_id =
                form.elements.namedItem("category_id")
                    .value || null;

            // ------------------------------------------------
            // 12.4. Trạng thái sản phẩm mới
            // ------------------------------------------------

            data.is_new = Number(
                isNewSelect.value
            );

            // Kiểm tra trạng thái hợp lệ
            if (![0, 1].includes(data.is_new)) {
                throw new Error(
                    "Trạng thái sản phẩm mới phải là Có hoặc Không"
                );
            }

            // ------------------------------------------------
            // 12.5. Kiểm tra giá và số lượng tồn kho
            // ------------------------------------------------

            if (
                !Number.isFinite(data.price) ||
                data.price < 0 ||
                !Number.isSafeInteger(data.stock) ||
                data.stock < 0
            ) {
                throw new Error(
                    "Giá bán hoặc tồn kho không hợp lệ"
                );
            }

            // ------------------------------------------------
            // 12.6. Xử lý hình ảnh sản phẩm
            // ------------------------------------------------

            if (imageFile.files.length) {

                showMessage(
                    "Đang tải ảnh lên máy chủ..."
                );

                data.image_url = await uploadImage(
                    imageFile.files[0]
                );

            } else {

                const raw =
                    imageUrlInput.value.trim();

                if (raw) {

                    const url = new URL(raw);

                    if (
                        !["http:", "https:"].includes(
                            url.protocol
                        )
                    ) {
                        throw new Error(
                            "Link ảnh phải dùng HTTP hoặc HTTPS"
                        );
                    }

                    data.image_url = url.href;

                } else {
                    data.image_url = null;
                }
            }

            // Giới hạn độ dài URL ảnh
            if (
                data.image_url &&
                data.image_url.length > 500
            ) {
                throw new Error(
                    "Link ảnh dài quá 500 ký tự"
                );
            }

            // ------------------------------------------------
            // 12.7. Gửi API thêm hoặc sửa sản phẩm
            // ------------------------------------------------

            showMessage(
                "Đang lưu thông tin vào MariaDB..."
            );

            const url = editingId
                ? `/products/${editingId}`
                : "/products";

            await api(url, {
                method: editingId
                    ? "PUT"
                    : "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)
            });

            // ------------------------------------------------
            // 12.8. Lưu thành công
            // ------------------------------------------------

            location.assign("products.html");

        } catch (error) {

            showMessage(
                `Không thể lưu sản phẩm: ${error.message}`,
                true
            );

        } finally {
            saveButton.disabled = false;
        }
    }
);


// ============================================================
// 13. KHỞI TẠO FORM
// ============================================================

loadForm().catch(error => {

    pageStatus.textContent =
        `Không thể mở form: ${error.message}`;
});


// ============================================================
// 14. GIẢI PHÓNG BỘ NHỚ KHI RỜI TRANG
// ============================================================

window.addEventListener("beforeunload", () => {

    if (currentPreviewObjectUrl) {

        URL.revokeObjectURL(
            currentPreviewObjectUrl
        );
    }
});
