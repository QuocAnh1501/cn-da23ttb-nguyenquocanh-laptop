
const API_BASE_URL = "http://localhost:3000/api";

// 1. Tải một thành phần HTML dùng chung
async function loadComponent(elementId, filePath) {
    const element = document.getElementById(elementId);

    if (!element) return;

    const response = await fetch(filePath);

    if (!response.ok) {
        throw new Error(
            `Không thể tải thành phần: ${filePath}`
        );
    }

    const html = await response.text();

    element.innerHTML = html;
}

// 2. Hiển thị tên khách hàng nếu đã đăng nhập
async function updateHeaderAccount() {
    const accountLink = document.getElementById("accountLink");
    const token = sessionStorage.getItem("laptop_token");

    if (!accountLink || !token) return;

    try {
        const response = await fetch(
            `${API_BASE_URL}/auth/me`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Token hết hạn hoặc không hợp lệ
        if (response.status === 401) {
            sessionStorage.removeItem("laptop_token");
            return;
        }

        if (!response.ok) {
            throw new Error("Không lấy được thông tin tài khoản");
        }

        const result = await response.json();
        const user = result.data;

        // Hiển thị nút quản lý nếu người dùng là Admin
        const adminPanelLink =
            document.getElementById("adminPanelLink");

        if (adminPanelLink) {
            adminPanelLink.hidden = user?.role !== "admin";
}

        if (user?.full_name) {
            const loginLink = document.getElementById("loginLink");

            // Đã đăng nhập thì ẩn nút Đăng nhập
            if (loginLink) {
                loginLink.hidden = true;
            }

            // Hiển thị lời chào khách hàng
            accountLink.textContent =
                `👤 Xin chào, ${user.full_name}`;

            accountLink.hidden = false;
        }


    } catch (error) {
        console.error("Lỗi tải tài khoản:", error);
    }
}

// 3. Tải Header và Footer
async function loadLayout() {
    try {
        await Promise.all([
            loadComponent(
                "site-header",
                "components/header.html"
            ),

            loadComponent(
                "site-footer",
                "components/footer.html"
            )
        ]);

        // Chạy sau khi Header đã được đưa vào trang
        await updateHeaderAccount();

    } catch (error) {
        console.error("Lỗi tải giao diện:", error);
    }
}

// 4. Khởi tạo giao diện dùng chung
loadLayout();
