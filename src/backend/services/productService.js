
const productModel = require("../models/productModel");

async function getAllProducts() {
    return productModel.getAll();
}

async function getProductById(id) {
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
        const error = new Error("ID sản phẩm không hợp lệ");
        error.statusCode = 400;
        throw error;
    }

    const product = await productModel.getById(productId);

    if (!product) {
        const error = new Error("Không tìm thấy sản phẩm");
        error.statusCode = 404;
        throw error;
    }

    return product;
}

async function createProduct(data) {
    const name = typeof data.name === "string"
        ? data.name.trim()
        : "";

    const slug = typeof data.slug === "string"
        ? data.slug.trim()
        : "";

    if (!name || !slug) {
        const error = new Error("Tên và slug sản phẩm là bắt buộc");
        error.statusCode = 400;
        throw error;
    }

    const price = Number(data.price ?? 0);
    const stock = Number(data.stock ?? 0);

    if (!Number.isFinite(price) || price < 0) {
        const error = new Error("Giá sản phẩm không hợp lệ");
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isInteger(stock) || stock < 0) {
        const error = new Error("Số lượng tồn kho phải là số nguyên không âm");
        error.statusCode = 400;
        throw error;
    }

    let category_id = null;

    if (data.category_id !== undefined &&
        data.category_id !== null &&
        data.category_id !== "") {
        category_id = Number(data.category_id);

        if (!Number.isInteger(category_id) || category_id <= 0) {
            const error = new Error("Danh mục không hợp lệ");
            error.statusCode = 400;
            throw error;
        }
    }

    return productModel.create({
        ...data,
        category_id,
        name,
        slug,
        price,
        stock
    });
}


async function updateProduct(id, data) {
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
        const error = new Error("ID sản phẩm không hợp lệ");
        error.statusCode = 400;
        throw error;
    }

    const existing = await productModel.getById(productId);

    if (!existing) {
        const error = new Error("Không tìm thấy sản phẩm");
        error.statusCode = 404;
        throw error;
    }

    const updates = { ...data };

    const allowedFields = [
        "category_id", "name", "slug", "brand", "model",
        "description", "price", "stock", "cpu", "ram",
        "storage", "gpu", "screen_size", "image_url"
    ];

    for (const field of Object.keys(updates)) {
        if (!allowedFields.includes(field)) {
            delete updates[field];
        }
    }

    if (Object.keys(updates).length === 0) {
        const error = new Error("Không có thông tin hợp lệ để cập nhật");
        error.statusCode = 400;
        throw error;
    }

    if ("name" in updates) {
        if (typeof updates.name !== "string" || !updates.name.trim()) {
            const error = new Error("Tên sản phẩm không được để trống");
            error.statusCode = 400;
            throw error;
        }
        updates.name = updates.name.trim();
    }

    if ("slug" in updates) {
        if (typeof updates.slug !== "string" || !updates.slug.trim()) {
            const error = new Error("Slug không được để trống");
            error.statusCode = 400;
            throw error;
        }
        updates.slug = updates.slug.trim();
    }

    if ("price" in updates) {
        updates.price = Number(updates.price);
        if (!Number.isFinite(updates.price) || updates.price < 0) {
            const error = new Error("Giá sản phẩm không hợp lệ");
            error.statusCode = 400;
            throw error;
        }
    }

    if ("stock" in updates) {
        updates.stock = Number(updates.stock);
        if (!Number.isInteger(updates.stock) || updates.stock < 0) {
            const error = new Error("Số lượng tồn kho không hợp lệ");
            error.statusCode = 400;
            throw error;
        }
    }

    if ("category_id" in updates) {
        if (updates.category_id === null || updates.category_id === "") {
            updates.category_id = null;
        } else {
            updates.category_id = Number(updates.category_id);
            if (!Number.isInteger(updates.category_id) ||
                updates.category_id <= 0) {
                const error = new Error("Danh mục không hợp lệ");
                error.statusCode = 400;
                throw error;
            }
        }
    }

    return productModel.update(productId, updates);
}

async function deleteProduct(id) {
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
        const error = new Error("ID sản phẩm không hợp lệ");
        error.statusCode = 400;
        throw error;
    }

    const deleted = await productModel.softDelete(productId);

    if (!deleted) {
        const error = new Error(
            "Không tìm thấy sản phẩm hoặc sản phẩm đã bị xóa"
        );
        error.statusCode = 404;
        throw error;
    }

    return true;
}


module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};

