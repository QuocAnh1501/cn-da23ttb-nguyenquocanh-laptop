
(() => {
    const navigation = document.querySelector(".navigation");
    const token = sessionStorage.getItem("laptop_token");

    if (!navigation || !token) return;

    async function showGreeting() {
        try {
            const response = await fetch(
                "http://localhost:3000/api/auth/me",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.status === 401) {
                sessionStorage.removeItem("laptop_token");
                return;
            }

            if (!response.ok) return;

            const result = await response.json();
            const user = result.data;

            if (!user) return;

            const greeting = document.createElement("a");
            greeting.href = "profile.html";
            greeting.className = "account-greeting";
            greeting.textContent = `👤 Xin chào, ${user.full_name}`;
            greeting.title = "Xem và cập nhật thông tin cá nhân";

            // Hiển thị bên cạnh mục Đăng nhập
            const loginLink = Array.from(
                navigation.querySelectorAll("a")
            ).find(a => a.getAttribute("href") === "login.html");

            if (loginLink) {
                loginLink.after(greeting);
            } else {
                navigation.appendChild(greeting);
            }

        } catch (error) {
            console.error("Không thể tải thông tin tài khoản", error);
        }
    }

    showGreeting();
})();
