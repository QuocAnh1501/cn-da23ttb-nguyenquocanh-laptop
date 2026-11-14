require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("node:path");
const app = express();

app.use(cors());
app.use(express.json());


// Cho phép trình duyệt tải ảnh sản phẩm đã upload
app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads"),
        {
            index: false,
            dotfiles: "deny"
        }
    )
);

// API tải ảnh - yêu cầu quyền Admin bên trong Router
const productImageRoutes =
    require("./routes/productImageRoutes");

app.use("/api/uploads/products", productImageRoutes);

app.get("/", (req, res) => {
res.json({
success: true,
message: "Laptop Store API is running"
});
});

app.get("/api/health", (req, res) => {
res.json({
success: true,
message: "API is healthy"
});
});
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

const categoryRoutes = require("./routes/categoryRoutes");
app.use("/api/categories", categoryRoutes);

const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);

const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

const chatbotRoutes = require("./routes/chatbotRoutes");
app.use("/api/chatbot", chatbotRoutes);

const errorMiddleware = require("./middlewares/errorMiddleware");
app.use(errorMiddleware);

module.exports = app;
