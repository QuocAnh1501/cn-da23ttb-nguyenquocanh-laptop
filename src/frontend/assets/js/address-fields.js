
/* ============================================================
   BỘ CHỌN ĐỊA CHỈ KHÁCH HÀNG
   - Tìm kiếm tỉnh/thành phố và xã/phường
   - Hỗ trợ tiếng Việt không dấu
   - Dùng chung cho hồ sơ và thanh toán
   ============================================================ */

(() => {
    "use strict";

    // 1. Chuẩn hóa dữ liệu địa chỉ
    const normalize = value => String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .normalize("NFC")
        .toLocaleLowerCase("vi-VN");

    const searchKey = value => String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();

    const sortByName = (a, b) =>
        a.name.localeCompare(b.name, "vi");

    let dataPromise;

    // 2. Đọc danh mục tỉnh, xã từ file JSON
    function catalog() {
        if (!dataPromise) {
            dataPromise = fetch(
                "assets/data/vietnam-addresses.json"
            )
                .then(response => {
                    if (!response.ok) {
                        throw new Error(
                            "Không tải được danh mục địa chỉ. Hãy kiểm tra file JSON."
                        );
                    }

                    return response.json();
                })
                .then(items => {
                    if (
                        !Array.isArray(items) ||
                        items.length !== 34 ||
                        items.some(p =>
                            !Array.isArray(p.wards) ||
                            !p.wards.length
                        )
                    ) {
                        throw new Error(
                            "Danh mục tỉnh/xã không hợp lệ."
                        );
                    }

                    return items.sort(sortByName);
                })
                .catch(error => {
                    dataPromise = null;
                    throw error;
                });
        }

        return dataPromise;
    }

    // 3. Ghép địa chỉ hoàn chỉnh
    function compose(detail, ward, province) {
        const parts = [detail, ward, province]
            .map(v => String(v || "").trim());

        if (!parts.every(Boolean)) {
            throw new Error(
                "Vui lòng nhập địa chỉ chi tiết và chọn đủ tỉnh, xã/phường."
            );
        }

        const address = parts.join(", ");

        if (address.length > 1000) {
            throw new Error(
                "Địa chỉ vượt quá 1000 ký tự."
            );
        }

        return address;
    }

    // 4. Phân tích địa chỉ đã lưu trong MariaDB
    function parseSaved(raw, provinces) {
        const parts = String(raw || "")
            .split(",")
            .map(x => x.trim());

        if (parts.length < 3) return null;

        const province = provinces.find(p =>
            normalize(p.name) === normalize(parts.at(-1))
        );

        const ward = province?.wards.find(w =>
            normalize(w.name) === normalize(parts.at(-2))
        );

        const detail = parts
            .slice(0, -2)
            .join(", ")
            .trim();

        return province && ward && detail
            ? { province, ward, detail }
            : null;
    }

    // 5. Các hàm hỗ trợ tạo HTML
    function element(tag, props = {}) {
        return Object.assign(
            document.createElement(tag),
            props
        );
    }

    function options(select, label, items) {
        select.replaceChildren(new Option(label, ""));

        for (const item of items) {
            select.add(
                new Option(item.name, String(item.code))
            );
        }
    }

    // 6. Tạo hộp chọn có chức năng tìm kiếm
    function searchable(select, placeholder, searchPlaceholder) {
        const root = element("div", {
            className: "address-combo"
        });

        const trigger = element("button", {
            type: "button",
            id: `${select.id}Button`,
            className: "address-combo-trigger"
        });

        const panel = element("div", {
            id: `${select.id}Panel`,
            className: "address-combo-panel",
            hidden: true
        });

        const search = element("input", {
            type: "search",
            className: "address-combo-search",
            placeholder: searchPlaceholder,
            autocomplete: "off"
        });

        const list = element("div", {
            className: "address-combo-list"
        });

        search.setAttribute(
            "aria-label", searchPlaceholder
        );

        trigger.setAttribute("aria-controls", panel.id);
        trigger.setAttribute("aria-expanded", "false");

        list.setAttribute("role", "group");
        list.setAttribute("aria-label", placeholder);

        panel.append(search, list);
        root.append(trigger, panel);
        select.after(root);

        // Ẩn select gốc nhưng vẫn sử dụng giá trị của nó
        select.hidden = true;
        select.required = false;

        function close(restoreFocus = false) {
            panel.hidden = true;

            trigger.setAttribute(
                "aria-expanded", "false"
            );

            if (restoreFocus && !trigger.disabled) {
                trigger.focus();
            }
        }

        function choose(value) {
            select.value = value;

            select.dispatchEvent(
                new Event("change", { bubbles: true })
            );

            refresh();
            close(true);
        }

        // Lọc danh sách theo nội dung tìm kiếm
        function render() {
            list.replaceChildren();

            const query = searchKey(search.value);

            const matches = Array.from(select.options)
                .filter(option =>
                    option.value &&
                    searchKey(option.text).includes(query)
                );

            if (!matches.length) {
                list.append(element("p", {
                    className: "address-combo-empty",
                    textContent: "Không tìm thấy kết quả"
                }));

                return;
            }

            for (const option of matches) {
                const button = element("button", {
                    type: "button",
                    className: "address-combo-option",
                    textContent: option.text
                });

                button.setAttribute(
                    "aria-pressed",
                    String(option.value === select.value)
                );

                button.addEventListener("click", () => {
                    choose(option.value);
                });

                list.append(button);
            }
        }

        function open() {
            if (trigger.disabled) return;

            search.value = "";
            panel.hidden = false;

            trigger.setAttribute(
                "aria-expanded", "true"
            );

            render();
            search.focus();
        }

        function refresh() {
            trigger.disabled = select.disabled;

            trigger.textContent = select.value
                ? select.selectedOptions[0]?.text || placeholder
                : placeholder;

            trigger.classList.toggle(
                "is-placeholder", !select.value
            );

            if (trigger.disabled) {
                close();
            } else if (!panel.hidden) {
                render();
            }
        }

        // Sự kiện mở và đóng hộp chọn
        trigger.addEventListener("click", () => {
            panel.hidden ? open() : close(true);
        });

        trigger.addEventListener("keydown", event => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                open();
            }
        });

        search.addEventListener("input", render);

        // Hỗ trợ thao tác bằng bàn phím
        search.addEventListener("keydown", event => {
            if (
                event.key === "Enter" ||
                event.key === "ArrowDown"
            ) {
                event.preventDefault();

                const first = list.querySelector("button");

                if (
                    first &&
                    event.key === "Enter" &&
                    list.querySelectorAll("button").length === 1
                ) {
                    first.click();
                } else {
                    first?.focus();
                }
            }
        });

        list.addEventListener("keydown", event => {
            if (
                !["ArrowDown", "ArrowUp"].includes(event.key)
            ) return;

            event.preventDefault();

            const buttons = Array.from(
                list.querySelectorAll("button")
            );

            const index = buttons.indexOf(
                document.activeElement
            );

            if (event.key === "ArrowUp" && index <= 0) {
                search.focus();
            } else {
                const next = Math.min(
                    buttons.length - 1,
                    index + (event.key === "ArrowDown" ? 1 : -1)
                );

                buttons[next]?.focus();
            }
        });

        // Đóng hộp chọn khi nhấn Escape hoặc bấm ra ngoài
        root.addEventListener("keydown", event => {
            if (event.key === "Escape" && !panel.hidden) {
                event.preventDefault();
                close(true);
            }
        });

        root.addEventListener("focusout", event => {
            if (
                event.relatedTarget &&
                !root.contains(event.relatedTarget)
            ) {
                close();
            }
        });

        document.addEventListener("pointerdown", event => {
            if (!root.contains(event.target)) close();
        });

        refresh();

        return { refresh, close, trigger };
    }

    // 7. Khởi tạo các trường địa chỉ
    function mount(textarea, prefix) {
        const wrapper = element("div", {
            className: "address-fields",
            hidden: true
        });

        const province = element("select", {
            id: `${prefix}Province`,
            required: true
        });

        const ward = element("select", {
            id: `${prefix}Ward`,
            required: true
        });

        const detail = element("input", {
            id: `${prefix}Detail`,
            type: "text",
            required: true,
            maxLength: 700,
            placeholder: "VD: Số 25, đường A, ấp 1"
        });

        const status = element("p", {
            className: "address-note"
        });

        status.setAttribute("role", "status");

        const retry = element("button", {
            type: "button",
            className: "address-retry",
            textContent: "Tải lại danh mục",
            hidden: true
        });

        function field(label, input) {
            const box = element("div", {
                className: "address-field"
            });

            box.append(
                element("label", {
                    htmlFor: input.id,
                    textContent: label
                }),
                input
            );

            return box;
        }

        wrapper.append(
            field("Tỉnh / Thành phố", province),
            field("Xã / Phường / Đặc khu", ward),
            field("Số nhà, đường, ấp hoặc khóm", detail),
            status,
            retry
        );

        textarea.after(wrapper);

        const provinceCombo = searchable(
            province,
            "-- Chọn tỉnh/thành phố --",
            "Tìm tên tỉnh/thành phố..."
        );

        const wardCombo = searchable(
            ward,
            "-- Chọn xã/phường --",
            "Tìm tên xã/phường..."
        );

        wrapper.querySelector(
            `label[for="${province.id}"]`
        ).htmlFor = provinceCombo.trigger.id;

        wrapper.querySelector(
            `label[for="${ward.id}"]`
        ).htmlFor = wardCombo.trigger.id;

        const originalLabel = textarea.id
            ? document.querySelector(
                `label[for="${textarea.id}"]`
            )
            : null;

        let provinces = [];
        let active = false;
        let ready = false;
        let busy = false;
        let pendingSaved = null;

        // Hiển thị xã/phường theo tỉnh đã chọn
        function listWards(value = "") {
            const selected = provinces.find(p =>
                String(p.code) === province.value
            );

            options(
                ward,
                "-- Chọn xã/phường --",
                [...(selected?.wards || [])].sort(sortByName)
            );

            ward.value = value;
            ward.disabled = !active || !ready || !selected;

            wardCombo.refresh();
        }

        function controls() {
            province.disabled = !active || !ready;
            detail.disabled = !active || !ready;

            ward.disabled =
                !active || !ready || !province.value;

            provinceCombo.refresh();
            wardCombo.refresh();
        }

        // Tải dữ liệu địa chỉ
        async function load() {
            if (ready || busy) return;

            busy = true;
            retry.hidden = true;

            status.textContent =
                "Đang tải danh mục địa chỉ...";

            try {
                provinces = await catalog();

                options(
                    province,
                    "-- Chọn tỉnh/thành phố --",
                    provinces
                );

                ready = true;
                status.textContent = "";

                if (pendingSaved !== null) {
                    const raw = pendingSaved;
                    pendingSaved = null;
                    restore(raw);
                } else {
                    listWards();
                }

            } catch (error) {
                status.textContent = error.message;
                retry.hidden = false;

            } finally {
                busy = false;
                controls();
            }
        }

        // Khôi phục địa chỉ khách hàng đã lưu
        function restore(raw) {
            raw = String(raw || "").trim();

            if (!ready) {
                pendingSaved = raw;
                return load();
            }

            const saved = parseSaved(raw, provinces);

            province.value = saved
                ? String(saved.province.code)
                : "";

            listWards(
                saved ? String(saved.ward.code) : ""
            );

            detail.value = saved ? saved.detail : "";

            status.textContent = saved || !raw
                ? ""
                : `Địa chỉ đã lưu: ${raw}. Vui lòng chọn lại tỉnh, xã/phường theo danh mục mới trước khi lưu.`;

            controls();
        }

        function setActive(value) {
            active = Boolean(value);

            wrapper.hidden = !active;
            textarea.hidden = active;

            textarea.required = false;
            textarea.readOnly = true;

            if (originalLabel) {
                originalLabel.htmlFor = active
                    ? provinceCombo.trigger.id
                    : textarea.id;
            }

            if (!active) {
                provinceCombo.close();
                wardCombo.close();
            }

            controls();

            if (active) void load();
        }

        // Lấy chuỗi địa chỉ để gửi API
        function getValue() {
            if (!active || !ready) {
                throw new Error(
                    "Danh mục địa chỉ chưa tải xong. Vui lòng thử lại."
                );
            }

            const p = provinces.find(item =>
                String(item.code) === province.value
            );

            const w = p?.wards.find(item =>
                String(item.code) === ward.value
            );

            return compose(detail.value, w?.name, p?.name);
        }

        options(province, "-- Chọn tỉnh/thành phố --", []);
        options(ward, "-- Chọn xã/phường --", []);

        province.addEventListener(
            "change", () => listWards()
        );

        retry.addEventListener("click", load);

        controls();

        return { setActive, restore, getValue };
    }

    // 8. Áp dụng cho trang thông tin cá nhân
    function setupProfile() {
        const picker = mount(
            document.getElementById("address"),
            "profileAddress"
        );

        picker.setActive(true);

        return picker;
    }

    // 9. Áp dụng cho trang thanh toán
    function setupCheckout() {
        const form = document.getElementById("checkoutForm");
        const name = document.getElementById("receiver_name");
        const phone = document.getElementById("receiver_phone");

        const textarea = document.getElementById(
            "shipping_address"
        );

        const nameLabel = form.querySelector(
            'label[for="receiver_name"]'
        );

        const picker = mount(textarea, "shippingAddress");

        const choices = element("fieldset", {
            className: "address-mode"
        });

        const legend = element("legend", {
            textContent: "Chọn thông tin nhận hàng"
        });

        const defaultRadio = element("input", {
            type: "radio",
            name: "shipping_address_mode",
            value: "default",
            checked: true
        });

        const otherRadio = element("input", {
            type: "radio",
            name: "shipping_address_mode",
            value: "other"
        });

        function radioLabel(input, text) {
            const label = element("label");
            label.append(input, document.createTextNode(text));

            return label;
        }

        const hint = element("p", {
            className: "address-note"
        });

        choices.append(
            legend,
            radioLabel(defaultRadio, "Sử dụng thông tin mặc định"),
            radioLabel(otherRadio, "Giao đến địa chỉ khác / Đặt hàng hộ"),
            hint
        );

        nameLabel.before(choices);

        let saved = null;
        let otherDraft = { name: "", phone: "" };

        // Kiểm tra thông tin mặc định đã đầy đủ chưa
        function complete(user) {
            return Boolean(
                String(user?.full_name || "").trim() &&
                /^[0-9+().\s-]{9,20}$/.test(
                    String(user?.phone || "").trim()
                ) &&
                String(user?.address || "").trim().length >= 5
            );
        }

        // Chuyển đổi địa chỉ mặc định và địa chỉ khác
        function updateMode() {
            const other = otherRadio.checked;

            name.readOnly = phone.readOnly = !other;

            picker.setActive(other);

            if (other) {
                name.value = otherDraft.name;
                phone.value = otherDraft.phone;
                textarea.value = "";

                hint.textContent =
                    "Thông tin này chỉ áp dụng cho đơn hàng hiện tại.";

            } else {
                name.value = saved?.full_name || "";
                phone.value = saved?.phone || "";
                textarea.value = saved?.address || "";

                hint.textContent =
                    "Thông tin được lấy từ hồ sơ khách hàng.";
            }
        }

        defaultRadio.addEventListener("change", () => {
            otherDraft = {
                name: name.value,
                phone: phone.value
            };

            updateMode();
        });

        otherRadio.addEventListener("change", updateMode);

        function setCustomer(user) {
            saved = user;

            const valid = complete(user);

            defaultRadio.disabled = !valid;
            defaultRadio.checked = valid;
            otherRadio.checked = !valid;

            if (!valid) {
                otherDraft = {
                    name: user.full_name || "",
                    phone: user.phone || ""
                };
            }

            updateMode();

            if (!valid) {
                hint.textContent =
                    "Hồ sơ chưa đủ thông tin. Hãy nhập người nhận và chọn địa chỉ giao hàng hoặc cập nhật hồ sơ.";
            }
        }

        function getValue() {
            if (otherRadio.checked) {
                return picker.getValue();
            }

            if (!complete(saved)) {
                throw new Error(
                    "Thông tin mặc định chưa đầy đủ."
                );
            }

            return saved.address.trim();
        }

        return { setCustomer, getValue };
    }

    // 10. Xuất chức năng để các trang khác sử dụng
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { compose, parseSaved, searchKey };
    } else {
        window.LaptopAddress = {
            setupProfile,
            setupCheckout
        };
    }
})();
