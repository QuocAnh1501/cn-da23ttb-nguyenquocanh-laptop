// POST /api/uploads/products - chỉ Admin được tải ảnh sản phẩm
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { authenticate, authorizeAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, parts: 1 }
});

// Kiểm tra chữ ký (magic bytes), không chỉ tin MIME do trình duyệt cung cấp
function imageExtension(file) {
    const b = file.buffer;
    if (file.mimetype === "image/jpeg" && b.length >= 3 &&
        b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";

    if (file.mimetype === "image/png" && b.length >= 8 &&
        b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";

    if (file.mimetype === "image/webp" && b.length >= 12 &&
        b.toString("ascii", 0, 4) === "RIFF" &&
        b.toString("ascii", 8, 12) === "WEBP") return "webp";

    return null;
}

router.post(
    "/",
    authenticate,
    authorizeAdmin,
    (req, res, next) => {
        upload.single("image")(req, res, error => {
            if (error) {
                error.statusCode = 400;
                return next(error);
            }
            next();
        });
    },
    async (req, res, next) => {
        try {
            if (!req.file) {
                const error = new Error("Vui lòng chọn ảnh sản phẩm");
                error.statusCode = 400;
                throw error;
            }

            const extension = imageExtension(req.file);
            if (!extension) {
                const error = new Error("Chỉ hỗ trợ ảnh JPEG, PNG, WebP hợp lệ");
                error.statusCode = 400;
                throw error;
            }

            const dir = path.join(__dirname, "..", "uploads", "products");
            await fs.mkdir(dir, { recursive: true });
            const filename = `${randomUUID()}.${extension}`;
            await fs.writeFile(path.join(dir, filename), req.file.buffer, { flag: "wx" });

            res.status(201).json({
                success: true,
                message: "Tải ảnh lên thành công",
                data: { image_url: `/uploads/products/${filename}` }
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
