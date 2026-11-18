
/* ============================================================
   LAPTOP STORE - TRANG CHỦ
   Chức năng:
   1. Hiển thị danh sách laptop
   2. Tìm kiếm sản phẩm theo tên, hãng, model
   3. Lọc theo nhiều danh mục bằng checkbox
   4. Lọc theo nhiều khoảng giá bằng checkbox
   5. Kết hợp tìm kiếm, danh mục và khoảng giá
   6. Xóa bộ lọc
   ============================================================ */

const API_URL = "http://localhost:3000/api";

// ============================================================
// 01. KHAI BÁO CÁC PHẦN TỬ HTML
// ============================================================

// Danh sách và trạng thái sản phẩm
const productList = document.getElementById("productList");
const productStatus = document.getElementById("productStatus");

// Ô tìm kiếm laptop
const searchInput = document.getElementById("searchInput");

// Danh sách checkbox lọc theo danh mục
const categoryFilterList =
    document.getElementById("categoryFilterList");

// Danh sách checkbox lọc theo giá tiền
const priceFilterList =
    document.getElementById("priceFilterList");

// Nút xóa bộ lọc
const clearProductFilters =
    document.getElementById("clearProductFilters");

// Lưu toàn bộ sản phẩm lấy từ API
let allProducts = [];


// ============================================================
// 02. HÀM ĐỊNH DẠNG GIÁ TIỀN
// ============================================================

function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(price));
}


// ============================================================
// 03. CHUẨN HÓA TỪ KHÓA TÌM KIẾM
// Hỗ trợ tìm kiếm có dấu và không dấu
// ============================================================

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();
}



/* ============================================================
   04. HIỂN THỊ DANH SÁCH SẢN PHẨM
   - Hiển thị laptop
   - Hiển thị nhãn MỚI
   - Hình ảnh, cấu hình, giá bán và tồn kho
   ============================================================ */

function renderProducts(products) {

    // Xóa danh sách sản phẩm cũ
    productList.replaceChildren();

    // Không có kết quả phù hợp
    if (products.length === 0) {
        productStatus.textContent =
            "Không tìm thấy laptop phù hợp với bộ lọc.";
        return;
    }

    // Hiển thị số lượng sản phẩm
    productStatus.textContent =
        `Đang hiển thị ${products.length} sản phẩm`;

    // Tạo từng thẻ laptop
    products.forEach(product => {

        // ----------------------------------------------------
        // 4.1. Tạo thẻ sản phẩm
        // ----------------------------------------------------

        const card = document.createElement("article");
        card.className = "product-card";

        // ----------------------------------------------------
        // 4.2. Hiển thị nhãn MỚI nếu Admin đã đánh dấu
        // ----------------------------------------------------

        if (Number(product.is_new) === 1) {

            const newBadge = document.createElement("span");

            newBadge.className = "product-new-badge";
            newBadge.textContent = "MỚI";

            // Đặt nhãn trực tiếp trên thẻ sản phẩm
            card.appendChild(newBadge);
        }

        // ----------------------------------------------------
        // 4.3. Hình ảnh sản phẩm
        // ----------------------------------------------------

        const image = document.createElement("div");
        image.className = "product-image";

        // Ảnh local dự phòng
        const localImages = {
            1: "assets/images/dell-inspiron-15.jpg",
            2: "assets/images/asus-tuf-f15.jpg"
        };

        // Ưu tiên ảnh từ database
        const imageUrl =
            product.image_url || localImages[product.id];

        if (imageUrl) {

            const img = document.createElement("img");

            img.src = imageUrl;
            img.alt = product.name;
            img.loading = "lazy";

            // Nếu ảnh lỗi, dùng biểu tượng laptop
            img.onerror = () => {
                img.remove();
                image.textContent = "💻";
            };

            image.appendChild(img);

        } else {
            image.textContent = "💻";
        }

        // ----------------------------------------------------
        // 4.4. Tên laptop
        // ----------------------------------------------------

        const name = document.createElement("h3");
        name.textContent = product.name;

        // ----------------------------------------------------
        // 4.5. Thông tin cấu hình
        // ----------------------------------------------------

        const description = document.createElement("p");
        description.className = "product-description";

        description.textContent = [
            product.brand,
            product.cpu,
            product.ram,
            product.storage
        ]
            .filter(Boolean)
            .join(" • ");

        // ----------------------------------------------------
        // 4.6. Giá bán
        // ----------------------------------------------------

        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent = formatPrice(product.price);

        // ----------------------------------------------------
        // 4.7. Số lượng tồn kho
        // ----------------------------------------------------

        const stock = document.createElement("p");
        stock.className = "product-stock";

        stock.textContent =
            Number(product.stock) > 0
                ? `Còn ${product.stock} sản phẩm`
                : "Tạm hết hàng";

        // ----------------------------------------------------
        // 4.8. Nút xem chi tiết sản phẩm
        // ----------------------------------------------------

        const detailLink = document.createElement("a");

        detailLink.href =
            `product-detail.html?id=${product.id}`;

        detailLink.className = "btn-primary btn-detail";
        detailLink.textContent = "Xem chi tiết";

        // ----------------------------------------------------
        // 4.9. Ghép các thành phần vào thẻ sản phẩm
        // ----------------------------------------------------

        card.append(
            image,
            name,
            description,
            price,
            stock,
            detailLink
        );

        // ----------------------------------------------------
        // 4.10. Hiển thị thẻ sản phẩm trên trang chủ
        // ----------------------------------------------------

        productList.appendChild(card);
    });
}



// ============================================================
// 05. TẢI DANH MỤC LAPTOP TỪ DATABASE
// API: GET /api/categories
// ============================================================

async function loadCategories() {

    if (!categoryFilterList) return;

    categoryFilterList.textContent =
        "Đang tải danh mục...";

    try {
        const response = await fetch(
            `${API_URL}/categories`
        );

        if (!response.ok) {
            throw new Error(
                `Không thể tải danh mục: HTTP ${response.status}`
            );
        }

        const result = await response.json();

        if (
            result.success === false ||
            !Array.isArray(result.data)
        ) {
            throw new Error(
                "Dữ liệu danh mục không hợp lệ"
            );
        }

        // Xóa danh mục cũ
        categoryFilterList.replaceChildren();

        // Chỉ hiển thị danh mục đang hoạt động
        const categories = result.data.filter(
            category => Number(category.is_active) === 1
        );

        // Không có danh mục
        if (categories.length === 0) {
            categoryFilterList.textContent =
                "Chưa có danh mục sản phẩm.";

            return;
        }

        // ----------------------------------------------------
        // 5.1. Tạo checkbox cho từng danh mục
        // ----------------------------------------------------

        categories.forEach(category => {

            const label = document.createElement("label");
            label.className = "filter-option";

            const checkbox = document.createElement("input");

            checkbox.type = "checkbox";
            checkbox.className = "filter-category";

            // Lưu ID danh mục để đối chiếu với sản phẩm
            checkbox.value = String(category.id);

            const text = document.createElement("span");
            text.textContent = category.name;

            label.append(checkbox, text);

            categoryFilterList.appendChild(label);
        });

        // Cập nhật lại danh sách theo bộ lọc
        applyProductFilters();

    } catch (error) {
        console.error("Lỗi tải danh mục:", error);

        categoryFilterList.textContent =
            "Không tải được danh mục. Vui lòng kiểm tra Backend.";
    }
}


// ============================================================
// 06. LẤY DANH MỤC ĐANG ĐƯỢC TÍCH CHỌN
// ============================================================

function getSelectedCategories() {

    if (!categoryFilterList) {
        return new Set();
    }

    const checkedCategories =
        categoryFilterList.querySelectorAll(
            ".filter-category:checked"
        );

    return new Set(
        Array.from(checkedCategories).map(
            checkbox => Number(checkbox.value)
        )
    );
}


// ============================================================
// 07. LẤY CÁC KHOẢNG GIÁ ĐANG ĐƯỢC CHỌN
// ============================================================

function getSelectedPriceRanges() {

    if (!priceFilterList) {
        return [];
    }

    const checkedPrices =
        priceFilterList.querySelectorAll(
            ".filter-price:checked"
        );

    return Array.from(checkedPrices).map(checkbox => {

        const min = Number(
            checkbox.dataset.min || 0
        );

        const max = checkbox.dataset.max
            ? Number(checkbox.dataset.max)
            : Infinity;

        return { min, max };
    });
}


// ============================================================
// 08. HÀM LỌC SẢN PHẨM
// Kết hợp tìm kiếm + danh mục + giá tiền
// ============================================================

function applyProductFilters() {

    // --------------------------------------------------------
    // 8.1. Lấy từ khóa tìm kiếm
    // --------------------------------------------------------

    const keyword = normalizeText(
        searchInput?.value || ""
    );

    // --------------------------------------------------------
    // 8.2. Lấy danh mục đang chọn
    // --------------------------------------------------------

    const selectedCategories =
        getSelectedCategories();

    // --------------------------------------------------------
    // 8.3. Lấy khoảng giá đang chọn
    // --------------------------------------------------------

    const selectedPriceRanges =
        getSelectedPriceRanges();

    // --------------------------------------------------------
    // 8.4. Lọc từ danh sách sản phẩm gốc
    // --------------------------------------------------------

    const filteredProducts = allProducts.filter(product => {

        // A. LỌC THEO TỪ KHÓA TÌM KIẾM

        const searchText = normalizeText([
            product.name,
            product.brand,
            product.model
        ]
            .filter(Boolean)
            .join(" "));

        const matchesSearch =
            keyword === "" ||
            searchText.includes(keyword);

        // B. LỌC THEO DANH MỤC

        const matchesCategory =
            selectedCategories.size === 0 ||
            selectedCategories.has(
                Number(product.category_id)
            );

        // C. LỌC THEO KHOẢNG GIÁ

        const productPrice = Number(product.price);

        const matchesPrice =
            selectedPriceRanges.length === 0 ||
            selectedPriceRanges.some(range => {

                return (
                    Number.isFinite(productPrice) &&
                    productPrice >= range.min &&
                    productPrice < range.max
                );
            });

        // D. SẢN PHẨM PHẢI THỎA MÃN CẢ BA ĐIỀU KIỆN

        return (
            matchesSearch &&
            matchesCategory &&
            matchesPrice
        );
    });

    // --------------------------------------------------------
    // 8.5. Hiển thị kết quả sau khi lọc
    // --------------------------------------------------------

    renderProducts(filteredProducts);
}


// ============================================================
// 09. TẢI DANH SÁCH LAPTOP TỪ API
// API: GET /api/products
// ============================================================

async function loadProducts() {

    productStatus.textContent =
        "Đang tải danh sách laptop...";

    try {
        const response = await fetch(
            `${API_URL}/products`
        );

        if (!response.ok) {
            throw new Error(
                `Không tải được sản phẩm: HTTP ${response.status}`
            );
        }

        const result = await response.json();

        if (
            result.success === false ||
            !Array.isArray(result.data)
        ) {
            throw new Error(
                "Dữ liệu sản phẩm không hợp lệ"
            );
        }

        // Lưu toàn bộ sản phẩm vào biến gốc
        allProducts = result.data;

        // Hiển thị sản phẩm theo điều kiện đang chọn
        applyProductFilters();

    } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);

        allProducts = [];
        productList.replaceChildren();

        productStatus.textContent =
            "Không thể tải sản phẩm. Vui lòng kiểm tra Backend.";
    }
}


// ============================================================
// 10. XỬ LÝ SỰ KIỆN TÌM KIẾM
// ============================================================

if (searchInput) {

    // Khi nhập tên laptop thì lọc ngay
    searchInput.addEventListener(
        "input",
        applyProductFilters
    );
}


// ============================================================
// 11. XỬ LÝ SỰ KIỆN CHỌN DANH MỤC
// ============================================================

if (categoryFilterList) {

    categoryFilterList.addEventListener(
        "change",
        event => {

            if (
                event.target.matches(".filter-category")
            ) {
                applyProductFilters();
            }
        }
    );
}


// ============================================================
// 12. XỬ LÝ SỰ KIỆN CHỌN KHOẢNG GIÁ
// ============================================================

if (priceFilterList) {

    priceFilterList.addEventListener(
        "change",
        event => {

            if (
                event.target.matches(".filter-price")
            ) {
                applyProductFilters();
            }
        }
    );
}


// ============================================================
// 13. XÓA TẤT CẢ BỘ LỌC
// ============================================================

if (clearProductFilters) {

    clearProductFilters.addEventListener(
        "click",
        () => {

            // Bỏ chọn tất cả danh mục
            if (categoryFilterList) {

                categoryFilterList.querySelectorAll(
                    ".filter-category"
                ).forEach(checkbox => {
                    checkbox.checked = false;
                });
            }

            // Bỏ chọn tất cả khoảng giá
            if (priceFilterList) {

                priceFilterList.querySelectorAll(
                    ".filter-price"
                ).forEach(checkbox => {
                    checkbox.checked = false;
                });
            }

            // Giữ nguyên từ khóa tìm kiếm
            applyProductFilters();
        }
    );
}


// ============================================================
// 14. KHỞI TẠO TRANG CHỦ
// ============================================================

// Tải các danh mục đang hoạt động
loadCategories();

// Tải danh sách laptop
loadProducts();
