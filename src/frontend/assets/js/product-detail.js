
const API_URL = "http://localhost:3000/api";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const statusElement = document.getElementById("detailsStatus");
const contentElement = document.getElementById("detailsContent");

function setText(id, value) {
    document.getElementById(id).textContent =
        value === null || value === undefined || value === ""
            ? "Chưa cập nhật"
            : String(value);
}

function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(price));
}

function showProduct(product) {
    setText("detailsName", product.name);
    setText("detailsBrand", product.brand);
    setText("detailsPrice", formatPrice(product.price));

    setText(
        "detailsStock",
        Number(product.stock) > 0
            ? `Còn ${product.stock} sản phẩm`
            : "Tạm hết hàng"
    );


    const addToCartButton =
        document.getElementById("addToCartButton");

    // Chỉ cho phép thêm khi laptop còn hàng
    addToCartButton.hidden = Number(product.stock) <= 0;


    setText("detailsCpu", product.cpu);
    setText("detailsRam", product.ram);
    setText("detailsStorage", product.storage);
    setText("detailsGpu", product.gpu);
    setText("detailsScreen", product.screen_size);
    setText("detailsDescription", product.description);

    const localImages = {
        1: "assets/images/dell-inspiron-15.jpg",
        2: "assets/images/asus-tuf-f15.jpg"
    };

    const imageUrl = product.image_url || localImages[product.id];

    if (imageUrl) {
        const image = document.getElementById("detailsImage");
        const placeholder = document.getElementById("detailsPlaceholder");

        image.onload = () => {
            image.hidden = false;
            placeholder.hidden = true;
        };

        image.onerror = () => {
            image.hidden = true;
            placeholder.hidden = false;
        };

        image.src = imageUrl;
        image.alt = product.name;
    }

    statusElement.hidden = true;
    contentElement.hidden = false;
}

async function loadProductDetail() {
    if (!productId || !/^[1-9]\d*$/.test(productId)) {
        statusElement.textContent = "ID sản phẩm không hợp lệ.";
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/products/${productId}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.data) {
            throw new Error("Không tìm thấy sản phẩm");
        }

        showProduct(result.data);

    } catch (error) {
        console.error("Lỗi tải chi tiết:", error);
        statusElement.textContent =
            "Không thể tải thông tin laptop. Hãy kiểm tra API hoặc ID sản phẩm.";
    }
}


const addToCartButton =
    document.getElementById("addToCartButton");

const cartMessage =
    document.getElementById("cartMessage");

addToCartButton.addEventListener("click", async () => {
    const token = sessionStorage.getItem("laptop_token");

    // Chưa đăng nhập thì chuyển đến trang đăng nhập
    if (!token) {
        const returnUrl = `product-detail.html?id=${productId}`;

        window.location.href =
            `login.html?return=${encodeURIComponent(returnUrl)}`;

        return;
    }

    addToCartButton.disabled = true;
    addToCartButton.textContent = "Đang thêm...";
    cartMessage.textContent = "";

    try {
        const response = await fetch(
            `${API_URL}/cart/items`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    product_id: Number(productId),
                    quantity: 1
                })
            }
        );

        const result = await response.json();

        if (response.status === 401) {
            sessionStorage.removeItem("laptop_token");

            const returnUrl =
                `product-detail.html?id=${productId}`;

            window.location.href =
                `login.html?return=${encodeURIComponent(returnUrl)}`;

            return;
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Không thể thêm vào giỏ hàng"
            );
        }

        cartMessage.textContent =
            `✅ Đã thêm vào giỏ hàng! ` +
            `Hiện có ${result.data.total_quantity} sản phẩm.`;

        cartMessage.style.color = "#15803d";

    } catch (error) {
        cartMessage.textContent = error.message;
        cartMessage.style.color = "#dc2626";
    } finally {
        addToCartButton.disabled = false;
        addToCartButton.textContent = "🛒 Thêm vào giỏ hàng";
    }
});


loadProductDetail();
