
const db = require("../db/connection");

function normalizePhone(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (number.startsWith("0") && number.length === 10) {
        number = "233" + number.substring(1);
    }

    if (!/^233\d{9}$/.test(number)) {
        throw new Error("Invalid Ghanaian mobile number.");
    }

    return number;
}

async function createSubscriber(data) {
    const {
        subscriptionType,
        amount,
        status = "ACTIVE",
        expiryDate,
        nextTipDate
    } = data;

    const phone = normalizePhone(data.phone);

    const allowedTypes = ["DAILY", "WEEKLY", "MONTHLY"];

    if (!allowedTypes.includes(subscriptionType)) {
        throw new Error("Invalid subscription type.");
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Invalid subscription amount.");
    }

    if (!expiryDate || !nextTipDate) {
        throw new Error("Expiry date and next tip date are required.");
    }

    const [result] = await db.query(
        `INSERT INTO subscribers
            (phone, subscription_type, amount, status,
             expiry_date, next_tip_date)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            subscription_type = VALUES(subscription_type),
            amount = VALUES(amount),
            status = VALUES(status),
            expiry_date = VALUES(expiry_date),
            next_tip_date = VALUES(next_tip_date)`,
        [
            phone,
            subscriptionType,
            Number(amount),
            status,
            expiryDate,
            nextTipDate
        ]
    );

    return result;
}

async function getSubscriberByPhone(phone) {
    const normalizedPhone = normalizePhone(phone);

    const [rows] = await db.query(
        `SELECT *
         FROM subscribers
         WHERE phone = ?
         LIMIT 1`,
        [normalizedPhone]
    );

    return rows.length ? rows[0] : null;
}

async function updateSubscriberStatus(phone, status) {
    const normalizedPhone = normalizePhone(phone);

    const allowedStatuses = ["ACTIVE", "EXPIRED", "CANCELLED"];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid subscriber status.");
    }

    const [result] = await db.query(
        `UPDATE subscribers
         SET status = ?
         WHERE phone = ?`,
        [status, normalizedPhone]
    );

    return result;
}

module.exports = {
    createSubscriber,
    getSubscriberByPhone,
    updateSubscriberStatus
};
