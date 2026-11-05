
const chatbotService = require("../services/chatbotService");

// POST /api/chatbot/message
async function sendMessage(req, res, next) {
    try {
        const result = await chatbotService.askQuestion(
            req.body?.message,
            {
                userId: req.user.id,
                sessionId: req.body?.session_id
            }
        );

        return res.status(200).json({
            success: true,
            message: "Chatbot tư vấn thành công",
            data: result
        });
    } catch (error) {
        next(error);
    }
}


// GET /api/chatbot/sessions
async function getSessions(req, res, next) {
    try {
        const sessions = await chatbotService.getMySessions(
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách cuộc trò chuyện thành công",
            data: sessions
        });
    } catch (error) {
        next(error);
    }
}

// GET /api/chatbot/sessions/:id
async function getSessionDetail(req, res, next) {
    try {
        const result = await chatbotService.getSessionDetail(
            req.user.id,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "Lấy lịch sử hội thoại thành công",
            data: result
        });
    } catch (error) {
        next(error);
    }
}

// DELETE /api/chatbot/sessions/:id
async function deleteSession(req, res, next) {
    try {
        await chatbotService.deleteMySession(
            req.user.id,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            message: "Xóa cuộc trò chuyện thành công"
        });
    } catch (error) {
        next(error);
    }
}


module.exports = {
    sendMessage,
    getSessions,
    getSessionDetail,
    deleteSession
};
