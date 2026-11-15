/* Thống kê và biểu đồ doanh thu – không phụ thuộc CDN/thư viện ngoài. */
(() => {
    const { $, api, element, message, money, todayVN, start } = window.LaptopAdmin;
    const form = $("revenueForm");
    let busy = false;
    $("revenueDate").value = todayVN();
    const dateLabel = value => value.split("-").reverse().join("/");
    function render(data) {
        $("revenueTotal").textContent = money(data.total_revenue);
        $("revenueOrders").textContent = data.paid_orders;
        const bars = $("revenueBars");
        const body = $("revenueTableBody");
        bars.replaceChildren(); body.replaceChildren();
        const max = Math.max(0, ...data.buckets.map(b => Number(b.revenue)));
        $("revenueChartScale").textContent = `Cột cao nhất: ${money(data.buckets.reduce((a, b) => Number(b.revenue) > Number(a) ? b.revenue : a, "0.00"))}`;
        for (const bucket of data.buckets) {
            const column = element("div", "", "revenue-column");
            const track = element("div", "", "revenue-track");
            const bar = element("div", "", "revenue-bar");
            const percentage = max ? Math.max(0, Number(bucket.revenue) / max * 100) : 0;
            bar.style.height = `${percentage}%`;
            if (Number(bucket.revenue) > 0) bar.style.minHeight = "2px";
            column.title = `${bucket.label}: ${money(bucket.revenue)} (${bucket.paid_orders} đơn)`;
            track.append(bar);
            column.append(track, element("span", bucket.label, "revenue-label"));
            bars.append(column);
            const row = element("tr");
            row.append(element("td", bucket.label), element("td", bucket.paid_orders), element("td", money(bucket.revenue)));
            body.append(row);
        }
        $("revenueEmpty").hidden = data.paid_orders > 0;
        $("revenueResults").hidden = false;
        message("revenueMessage", `Kỳ thống kê: ${dateLabel(data.from)} – ${dateLabel(data.to)} (UTC+7)`);
    }
    async function load() {
        if (busy || !form.reportValidity()) return;
        busy = true;
        $("loadRevenue").disabled = true;
        $("revenuePeriod").disabled = true;
        $("revenueDate").disabled = true;
        $("revenueResults").hidden = true;
        message("revenueMessage", "Đang tải thống kê...");
        try {
            const params = new URLSearchParams({ period: $("revenuePeriod").value, date: $("revenueDate").value });
            const data = await api(`/admin/revenue?${params}`);
            render(data);
        } catch (error) { message("revenueMessage", error.message, true); }
        finally {
            busy = false;
            $("loadRevenue").disabled = false;
            $("revenuePeriod").disabled = false;
            $("revenueDate").disabled = false;
        }
    }
    form.addEventListener("submit", event => { event.preventDefault(); load(); });
    $("revenuePeriod").addEventListener("change", load);
    start(load);
})();
