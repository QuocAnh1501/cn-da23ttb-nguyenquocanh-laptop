
const express = require("express");
const router = express.Router();

const categoryController = require("../controllers/categoryController");

const {
    authenticate,
    authorizeAdmin
} = require("../middlewares/authMiddleware");

// Công khai danh sách và chi tiết danh mục
router.get("/", categoryController.getAll);
router.get("/:id", categoryController.getById);

// Chỉ Admin được thay đổi danh mục
router.post(
    "/",
    authenticate,
    authorizeAdmin,
    categoryController.create
);

router.put(
    "/:id",
    authenticate,
    authorizeAdmin,
    categoryController.update
);

router.delete(
    "/:id",
    authenticate,
    authorizeAdmin,
    categoryController.remove
);

module.exports = router;
