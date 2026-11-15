
const API_URL = "http://localhost:3000/api";
const token = sessionStorage.getItem("laptop_token");

const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");
const saveButton = document.getElementById("saveButton");
// Khởi tạo bộ chọn địa chỉ
const profileAddressPicker = LaptopAddress.setupProfile();

function showMessage(message, isError = false) {
    profileMessage.textContent = message;
    profileMessage.style.color = isError
        ? "#dc2626"
        : "#15803d";
}

function redirectToLogin() {
    sessionStorage.removeItem("laptop_token");
    window.location.replace("login.html");
}

// 1. Lấy thông tin hiện tại từ MariaDB
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Không tải được thông tin");
        }

        const user = result.data;

        document.getElementById("fullName").value =
            user.full_name || "";

        document.getElementById("email").value =
            user.email || "";

        document.getElementById("phone").value =
            user.phone || "";

        document.getElementById("address").value =
            user.address || "";
        // Khôi phục địa chỉ đã lưu
        await profileAddressPicker.restore(user.address || "");

    } catch (error) {
        showMessage(error.message, true);
    }
}

// 2. Lưu thông tin khách hàng
profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const full_name = document.getElementById("fullName")
        .value.trim();

    const phone = document.getElementById("phone")
        .value.trim();

    // Ghép địa chỉ chi tiết, xã/phường và tỉnh/thành
        let address;

        try {
            address = profileAddressPicker.getValue();
        } catch (error) {
            showMessage(error.message, true);
            return;
        }

    saveButton.disabled = true;
    saveButton.textContent = "Đang lưu...";

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                full_name,
                phone,
                address
            })
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Không thể cập nhật thông tin"
            );
        }

        showMessage("Đã lưu thông tin thành công!");

    } catch (error) {
        showMessage(error.message, true);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu thông tin";
    }
});

// 3. Đăng xuất
document.getElementById("logoutButton")
    .addEventListener("click", () => {
        sessionStorage.removeItem("laptop_token");
        window.location.replace("login.html");
    });

// 4. Kiểm tra đăng nhập
if (!token) {
    window.location.replace("login.html");
} else {
    loadProfile();
}
