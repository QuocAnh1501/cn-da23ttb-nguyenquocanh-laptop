/* Quản lý danh mục: thêm, sửa, ngừng sử dụng và khôi phục. */
(() => {
    const { $, api, element, button, message, start } = window.LaptopAdmin;
    const form = $("categoryForm");
    let editingId = null;
    let categories = [];
    let busy = false;

    function resetForm() {
        editingId = null;
        form.reset();
        $("categoryFormTitle").textContent = "Thêm danh mục";
        $("saveCategory").textContent = "Thêm danh mục";
        $("cancelCategoryEdit").hidden = true;
    }
    function edit(category) {
        editingId = category.id;
        $("categoryFormTitle").textContent = `Sửa danh mục #${category.id}`;
        $("categoryName").value = category.name;
        $("categoryDescription").value = category.description || "";
        $("saveCategory").textContent = "Lưu thay đổi";
        $("cancelCategoryEdit").hidden = false;
        $("categoryName").focus();
    }
    function render() {
        const body = $("categoryTableBody");
        body.replaceChildren();
        $("categoryCount").textContent = categories.filter(c => Number(c.is_active) === 1).length;
        $("categoryInactive").textContent = categories.filter(c => Number(c.is_active) !== 1).length;
        const keyword = $("categorySearch").value.trim().toLocaleLowerCase("vi-VN");
        const shown = categories.filter(c => `${c.name} ${c.description || ""}`.toLocaleLowerCase("vi-VN").includes(keyword));
        for (const c of shown) {
            const active = Number(c.is_active) === 1;
            const row = element("tr");
            for (const value of [c.id, c.name, c.description || "—", c.product_count]) row.append(element("td", value));
            const state = element("td");
            state.append(element("span", active ? "Đang sử dụng" : "Ngừng sử dụng", "stock-badge " + (active ? "stock-ok" : "stock-empty")));
            const action = element("td");
            const actions = element("div", "", "admin-actions");
            if (active) {
                const editButton = button("Sửa", "admin-action-edit", () => edit(c));
                editButton.disabled = busy;
                actions.append(editButton);
            }
            const toggle = button(active ? "Ngừng sử dụng" : "Khôi phục", active ? "admin-action-delete" : "admin-action-edit", () => changeStatus(c, !active));
            toggle.disabled = busy || (active && Number(c.product_count) > 0);
            if (active && Number(c.product_count) > 0) toggle.title = "Hãy chuyển sản phẩm đang bán sang danh mục khác trước";
            actions.append(toggle);
            action.append(actions);
            row.append(state, action);
            body.append(row);
        }
        if (!shown.length) {
            const row = element("tr");
            const cell = element("td", "Không có danh mục phù hợp");
            cell.colSpan = 6;
            row.append(cell); body.append(row);
        }
    }
    function setBusy(value) {
        busy = value;
        $("saveCategory").disabled = value;
        $("reloadCategories").disabled = value;
        $("cancelCategoryEdit").disabled = value;
        render();
    }
    async function load() {
        categories = await api("/admin/categories");
        render();
    }
    async function reload() {
        setBusy(true);
        try { await load(); message("categoryMessage", "Đã tải danh mục"); }
        catch (error) { message("categoryMessage", error.message, true); }
        finally { setBusy(false); }
    }
    async function changeStatus(category, active) {
        if (busy || !confirm(`${active ? "Khôi phục" : "Ngừng sử dụng"} danh mục "${category.name}"?`)) return;
        setBusy(true);
        try {
            await api(`/admin/categories/${category.id}/status`, { method: "PATCH", body: JSON.stringify({ is_active: active }) });
            if (editingId === category.id) resetForm();
            await load();
            message("categoryMessage", active ? "Đã khôi phục danh mục" : "Đã ngừng sử dụng danh mục");
        } catch (error) { message("categoryMessage", error.message, true); }
        finally { setBusy(false); }
    }
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (busy || !form.reportValidity()) return;
        const name = $("categoryName").value.trim();
        const description = $("categoryDescription").value.trim();
        if (!name) { message("categoryMessage", "Tên danh mục không được để trống", true); return; }
        const id = editingId;
        setBusy(true);
        try {
            await api(id ? `/categories/${id}` : "/categories", {
                method: id ? "PUT" : "POST", body: JSON.stringify({ name, description: description || null })
            });
            resetForm();
            await load();
            message("categoryMessage", id ? "Đổi tên/cập nhật danh mục thành công" : "Thêm danh mục thành công");
        } catch (error) { message("categoryMessage", error.message, true); }
        finally { setBusy(false); }
    });
    $("cancelCategoryEdit").addEventListener("click", resetForm);
    $("reloadCategories").addEventListener("click", reload);
    $("categorySearch").addEventListener("input", render);
    start(reload);
})();
