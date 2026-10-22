
const categoryService = require("../services/categoryService");

// GET /api/categories
async function getAll(req, res, next) {
    try {
        const categories = await categoryService.getAllCategories();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        next(error);
    }
}

// GET /api/categories/:id
async function getById(req, res, next) {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        next(error);
    }
}

// POST /api/categories
async function create(req, res, next) {
    try {
        const category = await categoryService.createCategory(req.body);
        res.status(201).json({
            success: true,
            message: "Thêm danh mục thành công",
            data: category
        });
    } catch (error) {
        next(error);
    }
}

// PUT /api/categories/:id
async function update(req, res, next) {
    try {
        const category = await categoryService.updateCategory(
            req.params.id,
            req.body
        );

        res.json({
            success: true,
            message: "Cập nhật danh mục thành công",
            data: category
        });
    } catch (error) {
        next(error);
    }
}

// DELETE /api/categories/:id
async function remove(req, res, next) {
    try {
        await categoryService.deleteCategory(req.params.id);

        res.json({
            success: true,
            message: "Xóa danh mục thành công"
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};
