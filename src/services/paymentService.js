
const axios = require("axios");
const db = require("../db/connection");

const COLLECTION_ACCOUNT = process.env.HUBTEL_COLLECTION_ACCOUNT;
const APP_ID = process.env.HUBTEL_APP_ID;
const APP_KEY = process.env.HUBTEL_APP_KEY;

const BASE_URL = "https://rip.hubtel.com/api/proxy";

function getAuthHeaders() {
    const encodedCredentials = Buffer.from(
        `${APP_ID}:${APP_KEY}`
    ).toString("base64");

    console.log("Encoded Hubtel credentials:", encodedCredentials);
    console.log("Authorization header:", `Basic ${encodedCredentials}`);

    return {
        Authorization: `Basic ${encodedCredentials}`,
        "Content-Type": "application/json",
        Accept: "application/json"
    };
}

function formatDate(date) {
    return date.toISOString().slice(0, 19);
}

function getHubtelChannel(network) {
    const value = String(network).toUpperCase();

    if (value === "MTN") return "mtn_gh_rec";

    if (value === "TELECEL" || value === "VODAFONE") {
        return "vodafone_gh_rec";
    }

    throw new Error("Unsupported mobile money network.");
}

async function createInvoice({
    phone,
    amount,
    description,
    interval,
    channel
}) {
    const allowedIntervals = ["DAILY", "WEEKLY", "MONTHLY"];

    if (!allowedIntervals.includes(interval)) {
        throw new Error("Invalid subscription interval.");
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        throw new Error("Invalid subscription amount.");
    }

    if (!phone || !channel) {
        throw new Error("Phone number and payment channel are required.");
    }

    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);

    const payload = {
        orderDate: formatDate(start),
        invoiceEndDate: formatDate(end),
        description,
        startTime: "08:00",
        paymentInterval: interval,
        customerMobileNumber: phone,
        paymentOption: "MobileMoney",
        channel,
        customerName: "Safety Tips Customer",
        recurringAmount: Number(amount),
        totalAmount: Number(amount),
        initialAmount: Number(amount),
        currency: "GHS",
        callbackUrl: process.env.HUBTEL_CALLBACK_URL
    };

    const url =
        `${BASE_URL}/${COLLECTION_ACCOUNT}/create-invoice`;

    try {
        const response = await axios.post(url, payload, {
            headers: getAuthHeaders(),
            timeout: 30000
        });

        const body = response.data;
        const data = body?.data || body;

        const recurringInvoiceId = data?.recurringInvoiceId;
        const requestId = data?.requestId;
        const otpPrefix = data?.otpPrefix;

        if (!recurringInvoiceId || !requestId) {
            console.error("Unexpected Hubtel invoice response:", body);
            throw new Error(
                "Hubtel did not return the required invoice identifiers."
            );
        }

        // Save the pending invoice before asking for the OTP.
        await db.query(
            `INSERT INTO pending_invoices
                (phone, recurring_invoice_id, request_id, otp_prefix,
                 subscription_type, amount, channel, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_OTP', NOW())
             ON DUPLICATE KEY UPDATE
                recurring_invoice_id = VALUES(recurring_invoice_id),
                request_id = VALUES(request_id),
                otp_prefix = VALUES(otp_prefix),
                subscription_type = VALUES(subscription_type),
                amount = VALUES(amount),
                channel = VALUES(channel),
                status = 'PENDING_OTP',
                created_at = NOW()`,
            [
                phone,
                recurringInvoiceId,
                requestId,
                otpPrefix || null,
                interval,
                Number(amount),
                channel
            ]
        );

        return {
            success: true,
            recurringInvoiceId,
            requestId,
            otpPrefix,
            response: body
        };
    } catch (error) {
        console.error(
            "Hubtel Create Invoice error:",
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}

async function getPendingInvoice(phone) {
    const [rows] = await db.query(
        `SELECT *
         FROM pending_invoices
         WHERE phone = ?
           AND status = 'PENDING_OTP'
         ORDER BY created_at DESC
         LIMIT 1`,
        [phone]
    );

    return rows[0] || null;
}

async function verifyInvoice({ phone, otpCode }) {
    if (!otpCode) {
        throw new Error("OTP code is required.");
    }

    const invoice = await getPendingInvoice(phone);

    if (!invoice) {
        throw new Error("No pending invoice was found for this number.");
    }

    const url = `${BASE_URL}/verify-Invoice`;

    try {
        const response = await axios.post(
            url,
            {
                recurringInvoiceId: invoice.recurring_invoice_id,
                requestId: invoice.request_id,
                otpCode: String(otpCode).trim()
            },
            {
                headers: getAuthHeaders(),
                timeout: 30000
            }
        );

        // Verification is not the same as confirmed payment.
        // Keep the invoice pending until Hubtel confirms the payment.
        await db.query(
            `UPDATE pending_invoices
             SET status = 'VERIFICATION_SUBMITTED'
             WHERE id = ?`,
            [invoice.id]
        );

        return {
            success: true,
            response: response.data
        };
    } catch (error) {
        console.error(
            "Hubtel Verify Invoice error:",
            error.response?.status,
            error.response?.data || error.message
        );

        throw error;
    }
}

async function markInvoiceStatus(phone, status) {
    await db.query(
        `UPDATE pending_invoices
         SET status = ?
         WHERE phone = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [status, phone]
    );
}

module.exports = {
    createInvoice,
    getPendingInvoice,
    verifyInvoice,
    markInvoiceStatus,
    getHubtelChannel
};
