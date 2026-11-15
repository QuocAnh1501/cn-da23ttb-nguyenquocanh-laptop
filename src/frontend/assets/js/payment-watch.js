// Đọc lại trạng thái từ API đã xác thực. Không tự xác nhận tiền ở Frontend.
(() => {
    const active = new Map();
    window.watchPayment = function(orderId, fetchOrder, onFinished, onTimeout) {
        if (active.has(orderId)) return;
        const start = Date.now();
        const state = { timer: null };
        active.set(orderId, state);
        const stop = () => {
            clearTimeout(state.timer);
            active.delete(orderId);
        };
        async function check() {
            if (!active.has(orderId)) return;
            if (Date.now() - start > 10 * 60 * 1000) {
                stop();
                onTimeout?.();
                return;
            }
            try {
                const order = await fetchOrder(orderId);
                if (order?.payment_status === 'paid' || order?.status === 'cancelled') {
                    stop();
                    onFinished(order);
                    return;
                }
            } catch {
                // Mất kết nối: thử lại; không coi lỗi mạng là đã thanh toán.
            }
            state.timer = setTimeout(check, 3000);
        }
        check();
    };
    window.addEventListener('pagehide', () => {
        for (const state of active.values()) clearTimeout(state.timer);
        active.clear();
    });
})();
