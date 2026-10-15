const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
res.json({
success: true,
message: "Product API",
data: []
});
});

module.exports = router;