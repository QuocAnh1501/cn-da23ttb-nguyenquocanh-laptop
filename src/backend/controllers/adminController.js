const service = require("../services/adminService");

async function categories(req, res, next) {
    try {
        res.json({ success: true, data: await service.getCategories() });
    } catch (error) { next(error); }
}

async function categoryStatus(req, res, next) {
    try {
        res.json({ success: true, data: await service.setCategoryStatus(req.params.id, req.body) });
    } catch (error) { next(error); }
}

async function revenue(req, res, next) {
    try {
        res.json({ success: true, data: await service.getRevenue(req.query.period, req.query.date) });
    } catch (error) { next(error); }
}

module.exports = { categories, categoryStatus, revenue };
