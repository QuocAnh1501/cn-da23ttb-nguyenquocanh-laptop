
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


// ===============================================
// CẬP NHẬT THÔNG TIN TÀI KHOẢN TRÊN HEADER
// ===============================================
async function updateHeaderAccount() {
    const accountMenu =
        document.getElementById("accountMenu");

    const loginLink =
        document.getElementById("loginLink");

    const adminPanelLink =
        document.getElementById("adminPanelLink");

    const token =
        sessionStorage.getItem("laptop_token");

    if (!accountMenu) return;

    // Mặc định: chưa đăng nhập
    accountMenu.hidden = true;

    if (loginLink) loginLink.hidden = false;

    if (adminPanelLink) {
        adminPanelLink.hidden = true;
    }

    if (!token) return;

    try {
        const response = await fetch(
            `${API_BASE_URL}/auth/me`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Token hết hạn
        if (response.status === 401) {
            sessionStorage.removeItem("laptop_token");
            return;
        }

        if (!response.ok) {
            throw new Error(
                "Không lấy được thông tin tài khoản"
            );
        }

        const result = await response.json();
        const user = result.data;

        if (!user || !user.full_name) return;

        // Ẩn nút đăng nhập
        if (loginLink) {
            loginLink.hidden = true;
        }

        // Hiển thị menu tài khoản
        accountMenu.hidden = false;

        // Hiển thị tên trên Header
        document.getElementById("accountGreeting")
            .textContent = `Xin chào, ${user.full_name}`;

        // Hiển thị tên trong menu xổ xuống
        document.getElementById("accountMenuName")
            .textContent = user.full_name;

        // Avatar sử dụng chữ cái đầu của tên
        const initial = user.full_name
            .trim()
            .charAt(0)
            .toUpperCase();

        document.getElementById("accountAvatar")
            .textContent = initial;

        document.getElementById("accountDropdownAvatar")
            .textContent = initial;

        // Giữ nguyên chức năng Admin
        if (adminPanelLink) {
            adminPanelLink.hidden =
                user.role !== "admin";
        }

    } catch (error) {
        console.error(
            "Lỗi tải tài khoản:",
            error
        );
    }
}

// ===============================================
// MENU TÀI KHOẢN XỔ XUỐNG
// ===============================================
function setupAccountDropdown() {
    const menu =
        document.getElementById("accountMenu");

    const toggle =
        document.getElementById("accountLink");

    const dropdown =
        document.getElementById("accountDropdown");

    const logoutButton =
        document.getElementById("headerLogout");

    if (!menu || !toggle || !dropdown) return;

    // Đóng menu
    function closeDropdown() {
        dropdown.hidden = true;

        toggle.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    // Bấm tên tài khoản để mở hoặc đóng
    toggle.addEventListener("click", () => {
        const isOpen = !dropdown.hidden;

        dropdown.hidden = isOpen;

        toggle.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );
    });

    // Bấm ra ngoài sẽ tự đóng
    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target)) {
            closeDropdown();
        }
    });

    // Nhấn ESC để đóng menu
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDropdown();
            toggle.focus();
        }
    });

    // Đăng xuất tài khoản
    logoutButton?.addEventListener("click", () => {
        sessionStorage.removeItem("laptop_token");

        window.location.replace("login.html");
    });
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

        // Gắn sự kiện sau khi Header được tải
        setupAccountDropdown();

        // Hiển thị thông tin tài khoản
        await updateHeaderAccount();

    } catch (error) {
        console.error("Lỗi tải giao diện:", error);
    }
}

// 4. Khởi tạo giao diện dùng chung
loadLayout();
