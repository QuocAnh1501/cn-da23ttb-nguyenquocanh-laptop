
const categoryModel = require("../models/categoryModel");

function validateId(id) {
    const categoryId = Number(id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        const error = new Error("ID danh mục không hợp lệ");
        error.statusCode = 400;
        throw error;
    }

    return categoryId;
}

async function getAllCategories() {
    return categoryModel.getAll();
}

async function getCategoryById(id) {
    const categoryId = validateId(id);
    const category = await categoryModel.getById(categoryId);

    if (!category) {
        const error = new Error("Không tìm thấy danh mục");
        error.statusCode = 404;
        throw error;
    }

    return category;
}

async function createCategory(data) {
    if (!data.name || !data.name.trim()) {
        const error = new Error("Tên danh mục không được để trống");
        error.statusCode = 400;
        throw error;
    }

    return categoryModel.create({
        name: data.name.trim(),
        description: data.description ?? null
    });
}

async function updateCategory(id, data) {
    const categoryId = validateId(id);
    await getCategoryById(categoryId);

    const updates = {};

    if (Object.hasOwn(data, "name")) {
        if (typeof data.name !== "string" || !data.name.trim()) {
            const error = new Error("Tên danh mục không hợp lệ");
            error.statusCode = 400;
            throw error;
        }

        updates.name = data.name.trim();
    }

    if (Object.hasOwn(data, "description")) {
        updates.description = data.description;
    }

    if (Object.keys(updates).length === 0) {
        const error = new Error("Không có thông tin hợp lệ để cập nhật");
        error.statusCode = 400;
        throw error;
    }

    return categoryModel.update(categoryId, updates);
}

async function deleteCategory(id) {
    const categoryId = validateId(id);

    const deleted = await categoryModel.softDelete(categoryId);

    if (!deleted) {
        const error = new Error("Không tìm thấy danh mục đang hoạt động");
        error.statusCode = 404;
        throw error;
    }

    return true;
}

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
