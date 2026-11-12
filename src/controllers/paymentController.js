
const db = require("../db/connection");
const { sendSMS } = require("../services/smsService");

exports.paymentCallback = async (req, res) => {
    let connection;

    try {
        const payment = req.body;
        const data = payment?.Data;

        console.log("Hubtel callback received:", {
            responseCode: payment?.ResponseCode,
            message: payment?.Message,
            recurringInvoiceId: data?.RecurringInvoiceId,
            transactionId: data?.TransactionId
        });

        // These checks must be supplemented with Hubtel's
        // documented callback authentication/verification.
        if (payment?.ResponseCode !== "0000") {
            return res.sendStatus(200);
        }

        const invoiceId = data?.RecurringInvoiceId;
        const transactionId = data?.TransactionId;
        const phone = data?.CustomerMobileNumber;
        const amount = Number(data?.Amount);

        if (
            !invoiceId ||
            !transactionId ||
            !phone ||
            !Number.isFinite(amount)
        ) {
            console.error("Invalid Hubtel callback payload");
            return res.sendStatus(400);
        }

        const normalizedPhone = String(phone)
            .replace(/\D/g, "")
            .replace(/^0/, "233");

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [invoices] = await connection.query(
            `SELECT *
             FROM pending_invoices
             WHERE recurring_invoice_id = ?
               AND phone = ?
             LIMIT 1
             FOR UPDATE`,
            [invoiceId, normalizedPhone]
        );

        if (!invoices.length) {
            await connection.rollback();
            console.error("No matching invoice found");
            return res.sendStatus(200);
        }

        const invoice = invoices[0];

        if (Number(invoice.amount) !== amount) {
            await connection.rollback();
            console.error("Callback amount does not match invoice");
            return res.sendStatus(200);
        }

        if (invoice.status === "PAID") {
            await connection.commit();
            return res.sendStatus(200);
        }

        // TODO: Insert transactionId into a payments table with
        // a UNIQUE constraint before processing the payment.
        // This is necessary for robust duplicate-callback protection.

        const expiryDate = new Date();

        switch (invoice.subscription_type) {
            case "DAILY":
                expiryDate.setDate(expiryDate.getDate() + 1);
                break;

            case "WEEKLY":
                expiryDate.setDate(expiryDate.getDate() + 7);
                break;

            case "MONTHLY":
                expiryDate.setMonth(expiryDate.getMonth() + 1);
                break;

            default:
                await connection.rollback();
                return res.sendStatus(400);
        }

        await connection.query(
            `INSERT INTO subscribers
                (phone, subscription_type, amount, status,
                 next_tip_date, expiry_date)
             VALUES (?, ?, ?, 'ACTIVE', CURDATE(), ?)
             ON DUPLICATE KEY UPDATE
                subscription_type = VALUES(subscription_type),
                amount = VALUES(amount),
                status = 'ACTIVE',
                next_tip_date = CURDATE(),
                expiry_date = VALUES(expiry_date)`,
            [
                normalizedPhone,
                invoice.subscription_type,
                amount,
                expiryDate
            ]
        );

        await connection.query(
            `UPDATE pending_invoices
             SET status = 'PAID'
             WHERE id = ?`,
            [invoice.id]
        );

        await connection.commit();

        try {
            await sendSMS(
                normalizedPhone,
                `Welcome to Safety Tips.\n\nYour ${invoice.subscription_type} subscription is active. Thank you for subscribing.`
            );
        } catch (smsError) {
            console.error("Subscription SMS failed:", smsError.message);
        }

        return res.sendStatus(200);

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError.message);
            }
        }

        console.error("Payment callback error:", error.message);
        return res.sendStatus(500);

    } finally {
        if (connection) {
            connection.release();
        }
    }
};
