
const pool = require("../config/database");
const orderModel = require("../models/orderModel");

// Tạo thông báo lỗi
function createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

// Kiểm tra ID
function validateId(value) {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw createError("ID không hợp lệ");
    }

    return id;
}

// Chuyển giá DECIMAL sang đơn vị nhỏ nhất để tính chính xác
function toCents(value) {
    const str = String(value);

    if (!/^\d{1,13}(\.\d{1,2})?$/.test(str)) {
        throw createError("Giá sản phẩm không hợp lệ");
    }

    const [whole, decimal = ""] = str.split(".");

    return BigInt(whole) * 100n +
        BigInt(decimal.padEnd(2, "0"));
}

// Chuyển đơn vị nhỏ nhất thành chuỗi DECIMAL
function fromCents(value) {
    return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}

// 1. Tạo đơn hàng từ giỏ
async function createOrder(userId, data) {
    const validUserId = validateId(userId);

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw createError("Thông tin đặt hàng không hợp lệ");
    }

        const {
        receiver_name,
        receiver_phone,
        shipping_address,
        payment_method = "cod"
    } = data;

    if (!["cod", "bank_transfer"].includes(payment_method)) {
        throw createError("Phương thức thanh toán không hợp lệ");
    }
    // Kiểm tra ID các dòng giỏ hàng khách đã chọn
    const cartItemIds = data.cart_item_ids;

    if (
        !Array.isArray(cartItemIds) ||
        cartItemIds.length === 0 ||
        cartItemIds.length > 100 ||
        !cartItemIds.every(id =>
            typeof id === "number" &&
            Number.isSafeInteger(id) &&
            id > 0
        ) ||
        new Set(cartItemIds).size !== cartItemIds.length
    ) {
        throw createError(
            "Danh sách sản phẩm thanh toán không hợp lệ",
            400
        );
    }

    const selectedIdSet = new Set(cartItemIds);
    if (
        typeof receiver_name !== "string" ||
        !receiver_name.trim() ||
        receiver_name.trim().length > 120
    ) {
        throw createError("Tên người nhận không hợp lệ");
    }

    if (
        typeof receiver_phone !== "string" ||
        !/^[0-9+().\s-]{9,20}$/.test(receiver_phone.trim())
    ) {
        throw createError("Số điện thoại không hợp lệ");
    }

    if (
        typeof shipping_address !== "string" ||
        shipping_address.trim().length < 5 ||
        shipping_address.trim().length > 1000
    ) {
        throw createError("Địa chỉ giao hàng không hợp lệ");
    }

    const connection = await pool.getConnection();

    let orderId;

    try {
        // Bắt đầu transaction
        await connection.beginTransaction();

        // Tìm và khóa giỏ hàng
        const cart = await orderModel.findCartForUpdate(
            connection,
            validUserId
        );

        if (!cart) {
            throw createError("Giỏ hàng chưa có sản phẩm");
        }

        // Lấy danh sách sản phẩm trong giỏ
        const cartItems = await orderModel.getCartItemsForUpdate(
            connection,
            cart.id
        );
        // Chỉ lấy các dòng đã chọn và thuộc giỏ của khách
        const selectedCartItems = cartItems.filter(item =>
            selectedIdSet.has(Number(item.id))
        );

        // Không cho đặt sản phẩm không nằm trong giỏ
        if (selectedCartItems.length !== selectedIdSet.size) {
            throw createError(
                "Có sản phẩm đã chọn không tồn tại trong giỏ",
                400
            );
        }
        if (cartItems.length === 0) {
            throw createError("Giỏ hàng đang trống");
        }

        const orderItems = [];
        let totalCents = 0n;

        // Kiểm tra từng sản phẩm
        for (const item of selectedCartItems) {
            const product = await orderModel.getProductForUpdate(
                connection,
                item.product_id
            );

            if (!product || Number(product.is_active) !== 1) {
                throw createError(
                    "Có sản phẩm không còn được bán"
                );
            }

            const quantity = Number(item.quantity);

            if (
                !Number.isSafeInteger(quantity) ||
                quantity <= 0 ||
                quantity > Number(product.stock)
            ) {
                throw createError(
                    `Sản phẩm ${product.name} không đủ tồn kho`
                );
            }

            const unitCents = toCents(product.price);

            if (unitCents <= 0n) {
                throw createError(
                    `Giá sản phẩm ${product.name} không hợp lệ`
                );
            }

            const subtotalCents = unitCents * BigInt(quantity);

            totalCents += subtotalCents;

            if (totalCents > 999999999999999n) {
                throw createError("Tổng tiền vượt giới hạn cho phép");
            }

            orderItems.push({
                productId: product.id,
                productName: product.name,
                quantity,
                unitPrice: fromCents(unitCents),
                subtotal: fromCents(subtotalCents)
            });
        }

        // Tạo đơn hàng
        orderId = await orderModel.createOrder(connection, {
            userId: validUserId,
            receiverName: receiver_name.trim(),
            receiverPhone: receiver_phone.trim(),
            shippingAddress: shipping_address.trim(),
            totalAmount: fromCents(totalCents),
            paymentMethod: payment_method
        });

        // Lưu chi tiết đơn và trừ tồn kho
        for (const item of orderItems) {
            await orderModel.createOrderItem(connection, {
                orderId,
                ...item
            });

            const decreased = await orderModel.decreaseStock(
                connection,
                item.productId,
                item.quantity
            );

            if (!decreased) {
                throw createError(
                    `Không thể trừ tồn kho sản phẩm ${item.productName}`
                );
            }
        }

        // Chỉ xóa các dòng giỏ hàng đã thanh toán
        await orderModel.removeSelectedCartItems(
            connection,
            cart.id,
            selectedCartItems.map(item => item.id)
        );

        // Hoàn tất transaction
        await connection.commit();

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    // Trả về đơn hàng đã tạo
    const order = await orderModel.getOrderById(orderId);
    const items = await orderModel.getOrderItems(orderId);

    return {
        ...order,
        items
    };
}

// 2. Khách hàng xem lịch sử đơn hàng
async function getMyOrders(userId) {
    return orderModel.getOrdersByUserId(validateId(userId));
}

// 3. Xem chi tiết đơn hàng
async function getOrderDetail(orderId, user) {
    const validId = validateId(orderId);

    const order = await orderModel.getOrderById(validId);

    if (!order) {
        throw createError("Không tìm thấy đơn hàng", 404);
    }

    // Chỉ chủ đơn hàng hoặc Admin được xem
    if (
        order.user_id !== user.id &&
        user.role !== "admin"
    ) {
        throw createError("Không tìm thấy đơn hàng", 404);
    }

    const items = await orderModel.getOrderItems(validId);

    return {
        ...order,
        items
    };
}

// 4. Admin xem tất cả đơn hàng
async function getAllOrders() {
    return orderModel.getAllOrders();
}


    async function updateOrderStatus(
        orderId,
        data,
        customerId = null
    ) {
    const validOrderId = validateId(orderId);
    const newStatus = data?.status;

    // Các trạng thái được phép chuyển tiếp
    const allowedTransitions = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["shipping", "cancelled"],
        shipping: ["delivered"],
        delivered: [],
        cancelled: []
    };

    if (
        typeof newStatus !== "string" ||
        !Object.prototype.hasOwnProperty.call(
            allowedTransitions,
            newStatus
        )
    ) {
        throw createError("Trạng thái đơn hàng không hợp lệ");
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Khóa đơn hàng trước khi cập nhật
        const order = await orderModel.getOrderForUpdate(
            connection,
            validOrderId
        );

        if (!order) {
            throw createError("Không tìm thấy đơn hàng", 404);
        }
        // Kiểm tra quyền hủy đơn của khách hàng
        if (customerId !== null) {

            // Chỉ được hủy đơn hàng của chính mình
            if (Number(order.user_id) !== Number(customerId)) {
                throw createError("Không tìm thấy đơn hàng", 404);
            }

            // Khách hàng chỉ được thực hiện thao tác hủy
            if (newStatus !== "cancelled") {
                throw createError(
                    "Bạn không có quyền cập nhật trạng thái này",
                    403
                );
            }

            // Chỉ hủy khi Admin chưa xác nhận
            if (order.status !== "pending") {
                throw createError(
                    "Chỉ được hủy đơn hàng đang chờ xác nhận",
                    409
                );
            }

            // Không tự hủy đơn đã thanh toán
            if (order.payment_status !== "unpaid") {
                throw createError(
                    "Vui lòng liên hệ cửa hàng để xử lý hoàn tiền",
                    409
                );
            }

            // Đối với VietQR, khách phải xác nhận chưa chuyển tiền
            if (
                order.payment_method === "bank_transfer" &&
                data.not_transferred !== true
            ) {
                throw createError(
                    "Bạn cần xác nhận chưa chuyển khoản",
                    409
                );
            }
        }
        // Không cho phép chuyển trạng thái sai quy trình
        if (
            !allowedTransitions[order.status].includes(newStatus)
        ) {
            throw createError(
                `Không thể chuyển từ ${order.status} sang ${newStatus}`,
                409
            );
        }
        // Không xác nhận hoặc giao đơn VietQR chưa nhận tiền
        if (
            order.payment_method === "bank_transfer" &&
            order.payment_status !== "paid" &&
            newStatus !== "cancelled"
        ) {
            throw createError(
                "Đơn chuyển khoản chưa được xác nhận thanh toán",
                409
            );
        }

        // Không hủy đơn đã thanh toán nếu chưa có quy trình hoàn tiền
        if (
            newStatus === "cancelled" &&
            order.payment_status === "paid"
        ) {
            throw createError(
                "Đơn đã thanh toán cần xử lý hoàn tiền trước khi hủy",
                409
            );
        }

        // Nếu hủy đơn: hoàn trả tồn kho
        if (newStatus === "cancelled") {
            const items = await orderModel.getOrderItemsForUpdate(
                connection,
                validOrderId
            );

            for (const item of items) {
                await orderModel.restoreStock(
                    connection,
                    item.product_id,
                    item.quantity
                );
            }
        }


        // Chỉ tự đánh dấu đã thanh toán khi giao thành công đơn COD
        const paymentStatus =
            newStatus === "delivered" &&
            order.payment_method === "cod"
                ? "paid"
                : order.payment_status;

        await orderModel.updateOrderStatus(
            connection,
            validOrderId,
            newStatus,
            paymentStatus
        );

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    const updatedOrder = await orderModel.getOrderById(
        validOrderId
    );

    const items = await orderModel.getOrderItems(
        validOrderId
    );

    return {
        ...updatedOrder,
        items
    };
}


// Admin xác nhận đã nhận tiền chuyển khoản
async function confirmBankTransferPayment(orderId, data) {
    const validOrderId = validateId(orderId);

    if (data?.verified !== true) {
        throw createError(
            "Admin phải xác nhận đã kiểm tra giao dịch ngân hàng"
        );
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Khóa đơn để tránh xác nhận trùng đồng thời
        const order = await orderModel.getOrderForUpdate(
            connection,
            validOrderId
        );

        if (!order) {
            throw createError("Không tìm thấy đơn hàng", 404);
        }

        if (order.payment_method !== "bank_transfer") {
            throw createError(
                "Đơn hàng không thanh toán bằng chuyển khoản"
            );
        }

        if (order.status === "cancelled") {
            throw createError(
                "Không thể xác nhận thanh toán cho đơn đã hủy",
                409
            );
        }

        if (order.payment_status === "paid") {
            throw createError(
                "Đơn hàng đã được xác nhận thanh toán",
                409
            );
        }

        const updated = await orderModel.markBankTransferPaid(
            connection,
            validOrderId
        );

        if (!updated) {
            throw createError(
                "Không thể cập nhật thanh toán",
                409
            );
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    return orderModel.getOrderById(validOrderId);
}

module.exports = {
    createOrder,
    getMyOrders,
    getOrderDetail,
    getAllOrders,
    updateOrderStatus,
    confirmBankTransferPayment
};
