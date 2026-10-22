
const productService = require("../services/productService");

async function getAllProducts(req, res, next) {
    try {
        const products = await productService.getAllProducts();

        res.json({
            success: true,
            message: "Lấy danh sách sản phẩm thành công",
            data: products
        });
    } catch (error) {
        next(error);
    }
}

async function getProductById(req, res, next) {
    try {
        const product = await productService.getProductById(
            req.params.id
        );

        res.json({
            success: true,
            message: "Lấy thông tin sản phẩm thành công",
            data: product
        });
    } catch (error) {
        next(error);
    }
}

async function createProduct(req, res) {
    try {
        const product = await productService.createProduct(req.body);

        res.status(201).json({
            success: true,
            message: "Thêm sản phẩm thành công",
            data: product
        });
   } catch (error) {
        console.error("Lỗi thêm sản phẩm:", error);

        const status = error.statusCode ||
            (error.code === "ER_DUP_ENTRY" ? 409 :
             error.code === "ER_NO_REFERENCED_ROW_2" ? 400 : 500);

        res.status(status).json({
            success: false,
            message: error.code === "ER_DUP_ENTRY"
                ? "Slug sản phẩm đã tồn tại"
                : error.code === "ER_NO_REFERENCED_ROW_2"
                ? "Danh mục sản phẩm không tồn tại"
                : error.statusCode
                ? error.message
                : "Không thể thêm sản phẩm"
        });
    }
}


async function updateProduct(req, res) {
    try {
        const product = await productService.updateProduct(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Cập nhật sản phẩm thành công",
            data: product
        });
    } catch (error) {
        const status =
            error.statusCode ||
            (error.code === "ER_DUP_ENTRY" ? 409 :
             error.code === "ER_NO_REFERENCED_ROW_2" ? 400 : 500);

        res.status(status).json({
            success: false,
            message: error.code === "ER_DUP_ENTRY"
                ? "Slug sản phẩm đã tồn tại"
                : error.code === "ER_NO_REFERENCED_ROW_2"
                ? "Danh mục sản phẩm không tồn tại"
                : error.statusCode
                ? error.message
                : "Không thể cập nhật sản phẩm"
        });
    }
}


async function deleteProduct(req, res) {
    try {
        const result = await productService.deleteProduct(req.params.id);

        res.status(200).json({
            success: true,
            message: "Xóa sản phẩm thành công",
            data: result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Lỗi khi xóa sản phẩm"
        });
    }
}

module.exports = {
    getAllProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
};

