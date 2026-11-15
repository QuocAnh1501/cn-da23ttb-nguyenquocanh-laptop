/* Tiện ích dùng chung cho danh mục và thống kê. */
(() => {
    const $ = id => document.getElementById(id);
    const API = "http://localhost:3000/api";
    function login() {
        sessionStorage.removeItem("laptop_token");
        location.replace("../login.html?return=admin/" + location.pathname.split("/").pop());
    }
    async function api(path, options = {}) {
        const token = sessionStorage.getItem("laptop_token");
        if (!token) { login(); throw new Error("Bạn chưa đăng nhập"); }
        const response = await fetch(API + path, {
            ...options,
            headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
        });
        if (response.status === 401) { login(); throw new Error("Phiên đăng nhập hết hạn"); }
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) throw new Error(result?.message || `Lỗi HTTP ${response.status}`);
        return result.data;
    }
    function element(tag, value, className = "") {
        const node = document.createElement(tag);
        node.textContent = value ?? "";
        if (className) node.className = className;
        return node;
    }
    function button(label, className, action) {
        const node = element("button", label, className);
        node.type = "button";
        node.addEventListener("click", action);
        return node;
    }
    function message(id, value, isError = false) {
        $(id).textContent = value;
        $(id).classList.toggle("management-error", isError);
    }
    function todayVN() {
        const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
        const get = type => parts.find(p => p.type === type).value;
        return `${get("year")}-${get("month")}-${get("day")}`;
    }
    // Hiển thị số tiền nguyên hoặc phần lẻ mà không mất độ chính xác DECIMAL.
    function money(value) {
        const [whole, fraction = "00"] = String(value ?? "0").split(".");
        return new Intl.NumberFormat("vi-VN").format(BigInt(whole)) + (Number(fraction) ? "," + fraction.padEnd(2, "0") : "") + " ₫";
    }
    async function start(load) {
        $("adminLogout").addEventListener("click", () => {
            sessionStorage.removeItem("laptop_token");
            location.replace("../login.html");
        });
        try {
            const user = await api("/auth/me");
            if (user.role !== "admin") throw new Error("Bạn không có quyền quản trị");
            $("adminName").textContent = user.full_name || "Quản trị viên";
            $("adminStatus").hidden = true;
            $("adminApp").hidden = false;
            await load();
        } catch (error) {
            message("adminStatus", error.message, true);
            $("adminStatus").hidden = false;
        }
    }
    window.LaptopAdmin = { $, api, element, button, message, todayVN, money, start };
})();
