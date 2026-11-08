
const API_URL = "http://localhost:3000/api";

const registerForm = document.getElementById("registerForm");
const registerButton = document.getElementById("registerButton");
const registerMessage = document.getElementById("registerMessage");

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const full_name = document
        .getElementById("fullName").value.trim();

    const email = document
        .getElementById("email").value.trim();

    const password = document
        .getElementById("password").value;

    const confirmPassword = document
        .getElementById("confirmPassword").value;

    registerMessage.textContent = "";

    // Kiểm tra dữ liệu trước khi gửi API
    if (!full_name) {
        registerMessage.textContent = "Vui lòng nhập họ tên.";
        registerMessage.style.color = "#dc2626";
        return;
    }

    if (password !== confirmPassword) {
        registerMessage.textContent =
            "Mật khẩu xác nhận không khớp.";
        registerMessage.style.color = "#dc2626";
        return;
    }

    if (password.length < 8) {
        registerMessage.textContent =
            "Mật khẩu phải có ít nhất 8 ký tự.";
        registerMessage.style.color = "#dc2626";
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Đang đăng ký...";

    try {
        const response = await fetch(
            `${API_URL}/auth/register`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    full_name,
                    email,
                    password
                })
            }
        );

        const result = await response.json();

        if (!response.ok || result.success === false) {
            throw new Error(
                result.message || "Đăng ký thất bại"
            );
        }

        registerMessage.textContent =
            "Đăng ký thành công! Đang chuyển đến đăng nhập...";
        registerMessage.style.color = "#15803d";

        // Chuyển đến trang đăng nhập
        window.location.assign("login.html?registered=1");

    } catch (error) {
        registerMessage.textContent = error.message;
        registerMessage.style.color = "#dc2626";
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Đăng ký";
    }
});
