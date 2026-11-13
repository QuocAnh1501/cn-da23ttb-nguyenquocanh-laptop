
const API_URL = "http://localhost:3000/api";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginButton.disabled = true;
    loginButton.textContent = "Đang đăng nhập...";
    loginMessage.textContent = "";

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Đăng nhập thất bại");
        }

        const token = result.data?.token;

        if (!token) {
            throw new Error("Không nhận được token đăng nhập");
        }

        // Lưu token cho phiên trình duyệt hiện tại
        sessionStorage.setItem("laptop_token", token);

        loginMessage.textContent = "Đăng nhập thành công!";
        loginMessage.style.color = "#15803d";

        // Chỉ chấp nhận đường dẫn sản phẩm nội bộ
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get("return") || "";


        const role = result.data?.user?.role;

        const allowedPages = [
            "cart.html",
            "checkout.html",
            "orders.html",
            "admin/products.html"
        ];

        const validReturn =
            allowedPages.includes(returnTo) ||
            /^product-detail\.html\?id=[1-9]\d*$/.test(returnTo);

        let destination = role === "admin"
            ? "admin/products.html"
            : "index.html";

        if (validReturn) {
            // Customer không được chuyển đến trang Admin
            if (
                returnTo !== "admin/products.html" ||
                role === "admin"
            ) {
                destination = returnTo;
            }
        }

        window.location.assign(destination);

    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.color = "#dc2626";
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Đăng nhập";
    }
});
const queryParams = new URLSearchParams(window.location.search);

if (queryParams.get("registered") === "1") {
    loginMessage.textContent =
        "Đăng ký thành công! Vui lòng đăng nhập.";
    loginMessage.style.color = "#15803d";
}