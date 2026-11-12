
const axios = require("axios");

async function sendSMS(phone, message) {
    const clientId = process.env.HUBTEL_SMS_CLIENT_ID;
    const clientSecret = process.env.HUBTEL_SMS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Hubtel SMS credentials are missing.");
    }

    const auth = Buffer
        .from(`${clientId}:${clientSecret}`)
        .toString("base64");

    const response = await axios.post(
        "https://smsc.hubtel.com/v1/messages/send",
        {
            From: "SafetyTips",
            To: phone,
            Content: message
        },
        {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json"
            },
            timeout: 30000
        }
    );

    return response.data;
}

module.exports = { sendSMS };
