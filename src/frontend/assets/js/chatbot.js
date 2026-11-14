
(() => {
    const API = "http://localhost:3000/api";

    const root = document.getElementById("chatbot-root");
    if (!root) return;

    root.innerHTML = `
        <button id="chatToggle"
                class="ls-chat-toggle"
                aria-expanded="false"
                aria-controls="chatPanel">
            🤖 Tư vấn AI
        </button>

        <section id="chatPanel"
                 class="ls-chat-panel"
                 aria-label="Tư vấn laptop AI"
                 hidden>

            <div class="ls-chat-header">
                <strong>🤖 Laptop Store AI</strong>

                <div>
                    <button id="newChat"
                            type="button"
                            title="Cuộc trò chuyện mới">
                        + Mới
                    </button>

                    <button id="closeChat"
                            type="button"
                            title="Đóng chatbot">
                        ✕
                    </button>
                </div>
            </div>

            <div id="chatMessages"
                 class="ls-chat-messages"
                 aria-live="polite"></div>

            <p id="chatStatus"
               class="ls-chat-status"
               role="status"></p>

            <form id="chatForm" class="ls-chat-form">
                <input id="chatInput"
                       type="text"
                       maxlength="1000"
                       placeholder="Hỏi về laptop..."
                       aria-label="Nhập câu hỏi"
                       required>

                <button id="chatSend" type="submit">
                    Gửi
                </button>
            </form>
        </section>
    `;

    const toggle = document.getElementById("chatToggle");
    const panel = document.getElementById("chatPanel");
    const messages = document.getElementById("chatMessages");
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    const sendButton = document.getElementById("chatSend");
    const newButton = document.getElementById("newChat");
    const status = document.getElementById("chatStatus");

    let sessionId = null;
    let sessionKey = null;
    let sending = false;

    function addMessage(content, role) {
        const bubble = document.createElement("div");

        bubble.className =
            `ls-chat-bubble ls-chat-${role}`;

        // Không dùng innerHTML với nội dung AI
        bubble.textContent = content;

        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
    }

    function showWelcome() {
        messages.replaceChildren();

        addMessage(
            "Xin chào! 👋 Mình có thể giúp bạn " +
            "tìm laptop theo ngân sách và nhu cầu.",
            "assistant"
        );
    }

    function setOpen(open) {
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));

        if (open) input.focus();
    }

    toggle.addEventListener("click", () => {
        setOpen(panel.hidden);
    });

    document.getElementById("closeChat")
        .addEventListener("click", () => setOpen(false));

    newButton.addEventListener("click", () => {
        if (sending) return;

        sessionId = null;
        if (sessionKey) {
            sessionStorage.removeItem(sessionKey);
        }

        status.textContent = "";
        showWelcome();
    });

    async function apiRequest(path, options = {}) {
        const token =
            sessionStorage.getItem("laptop_token");

        if (!token) {
            throw new Error(
                "Bạn cần đăng nhập để sử dụng chatbot AI."
            );
        }

        const response = await fetch(`${API}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...options.headers
            }
        });

        const result = await response.json();

        if (response.status === 401) {
            sessionStorage.removeItem("laptop_token");
            throw new Error(
                "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại."
            );
        }

        if (!response.ok || result.success === false) {
            throw new Error(
                result.message || "Không thể kết nối chatbot"
            );
        }

        return result.data;
    }

    // Khôi phục cuộc trò chuyện trong phiên trình duyệt
    async function restoreChat() {
        const token = sessionStorage.getItem("laptop_token");
        if (!token) return;

        try {
            const user = await apiRequest("/auth/me");

            sessionKey = `laptop_chat_${user.id}`;

            const saved = Number(
                sessionStorage.getItem(sessionKey)
            );

            if (!Number.isSafeInteger(saved) || saved <= 0) {
                return;
            }

            const data = await apiRequest(
                `/chatbot/sessions/${saved}`
            );

            sessionId = saved;
            messages.replaceChildren();

            for (const item of data.messages || []) {
                addMessage(item.content, item.role);
            }
        } catch (error) {
            sessionId = null;
            if (sessionKey) {
                sessionStorage.removeItem(sessionKey);
            }
            showWelcome();
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (sending) return;

        const question = input.value.trim();

        if (!question || question.length > 1000) return;

        const token =
            sessionStorage.getItem("laptop_token");

        if (!token) {
            status.textContent =
                "Vui lòng đăng nhập trước khi hỏi AI.";
            return;
        }

        sending = true;
        sendButton.disabled = true;
        newButton.disabled = true;
        status.textContent = "AI đang trả lời...";

        addMessage(question, "user");
        input.value = "";

        try {
            const body = { message: question };

            if (sessionId !== null) {
                body.session_id = sessionId;
            }

            const data = await apiRequest(
                "/chatbot/message",
                {
                    method: "POST",
                    body: JSON.stringify(body)
                }
            );

            sessionId = data.session_id;

            if (sessionKey && sessionId) {
                sessionStorage.setItem(
                    sessionKey,
                    String(sessionId)
                );
            }

            addMessage(data.answer, "assistant");
            status.textContent = "";

        } catch (error) {
            status.textContent = error.message;
            status.style.color = "#dc2626";

            // Giữ câu hỏi để khách có thể gửi lại
            input.value = question;
        } finally {
            sending = false;
            sendButton.disabled = false;
            newButton.disabled = false;
        }
    });

    showWelcome();
    restoreChat();
})();
