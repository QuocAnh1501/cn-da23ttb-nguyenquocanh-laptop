require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

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
const productRoutes = require("./routes/productRoutes");

app.use("/api/products", productRoutes);

const categoryRoutes = require("./routes/categoryRoutes");
app.use("/api/categories", categoryRoutes);
module.exports = app;
