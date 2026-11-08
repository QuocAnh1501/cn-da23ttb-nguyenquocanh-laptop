
const API_URL = "http://localhost:3000/api";

const productList = document.getElementById("productList");
const productStatus = document.getElementById("productStatus");
const searchInput = document.getElementById("searchInput");

let allProducts = [];

function formatPrice(price) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(price));
}

function renderProducts(products) {
    productList.replaceChildren();

    if (products.length === 0) {
        productStatus.textContent = "Không tìm thấy laptop phù hợp.";
        return;
    }

    productStatus.textContent =
        `Đang hiển thị ${products.length} sản phẩm`;

    products.forEach(product => {
        const card = document.createElement("article");
        card.className = "product-card";


        const image = document.createElement("div");
        image.className = "product-image";

        // Ảnh lưu trong thư mục frontend
        const localImages = {
            1: "assets/images/dell-inspiron-15.jpg",
            2: "assets/images/asus-tuf-f15.jpg"
        };

        // Ưu tiên ảnh từ database, sau đó dùng ảnh local
        const imageUrl = product.image_url || localImages[product.id];

        if (imageUrl) {
            const img = document.createElement("img");

            img.src = imageUrl;
            img.alt = product.name;
            img.loading = "lazy";

            img.onerror = () => {
                img.remove();
                image.textContent = "💻";
            };

            image.appendChild(img);
        } else {
            image.textContent = "💻";
        }


        const name = document.createElement("h3");
        name.textContent = product.name;

        const description = document.createElement("p");
        description.className = "product-description";
        description.textContent = [
            product.brand,
            product.cpu,
            product.ram,
            product.storage
        ].filter(Boolean).join(" • ");

        const price = document.createElement("p");
        price.className = "product-price";
        price.textContent = formatPrice(product.price);

        const stock = document.createElement("p");
        stock.className = "product-stock";
        stock.textContent = Number(product.stock) > 0
            ? `Còn ${product.stock} sản phẩm`
            : "Tạm hết hàng";


        const detailLink = document.createElement("a");

        detailLink.href = `product-detail.html?id=${product.id}`;
        detailLink.className = "btn-primary btn-detail";
        detailLink.textContent = "Xem chi tiết";

        card.append(
            image,
            name,
            description,
            price,
            stock,
            detailLink
        );

productList.appendChild(card);

    });
}

async function loadProducts() {
    productStatus.textContent = "Đang tải sản phẩm...";

    try {
        const response = await fetch(`${API_URL}/products`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success === false) {
            throw new Error("API trả về lỗi");
        }

        allProducts = Array.isArray(result.data)
            ? result.data
            : [];

        renderProducts(allProducts);
    } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
        productStatus.textContent =
            "Không thể tải sản phẩm. Hãy kiểm tra backend.";
    }
}

searchInput.addEventListener("input", () => {
    const keyword = searchInput.value
        .trim()
        .toLowerCase();

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

loadProducts();
