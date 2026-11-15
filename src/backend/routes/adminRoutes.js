const express = require("express");
const controller = require("../controllers/adminController");
const { authenticate, authorizeAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();
// Toàn bộ API này chỉ dành cho Admin.
router.use(authenticate, authorizeAdmin);
router.get("/categories", controller.categories);
router.patch("/categories/:id/status", controller.categoryStatus);
router.get("/revenue", controller.revenue);
module.exports = router;
