
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

async function main() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Chưa cấu hình GEMINI_API_KEY");
    }

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });

    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        contents: "Hãy chào bằng tiếng Việt và giới thiệu ngắn gọn rằng bạn là trợ lý tư vấn laptop."
    });

    console.log("Phản hồi từ Gemini:");
    console.log(response.text);
}

main().catch((error) => {
    console.error("Lỗi gọi Gemini API:", error.message);
    process.exitCode = 1;
});
