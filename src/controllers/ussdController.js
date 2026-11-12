
const {
    createInvoice,
    verifyInvoice
} = require("../services/paymentService");

const {
    normalizePhone,
    detectNetwork,
    getHubtelChannel
} = require("../services/networkService");

const { getRandomTip } = require("../services/tipService");

const subscriptions = {
    "1*1": {
        amount: 1,
        interval: "DAILY",
        name: "Daily"
    },
    "1*2": {
        amount: 5,
        interval: "WEEKLY",
        name: "Weekly"
    },
    "1*3": {
        amount: 15,
        interval: "MONTHLY",
        name: "Monthly"
    }
};

exports.ussdController = async (req, res) => {
    const { Message, Mobile } = req.body;

    try {
        if (Message === undefined || !Mobile) {
            return res
                .status(200)
                .send("END Missing USSD message or phone number.");
        }

        const message = String(Message).trim();
        const phone = normalizePhone(Mobile);

        // OTP submission: OTP*123456
        if (message.startsWith("OTP*")) {
            const otpCode = message.substring(4).trim();

            if (!/^[A-Za-z0-9-]{4,12}$/.test(otpCode)) {
                return res
                    .status(200)
                    .send("CON Enter the valid verification code.");
            }

            await verifyInvoice({ phone, otpCode });

            return res
                .status(200)
                .send(
                    "END Verification submitted. " +
                    "Follow the mobile money approval instructions. " +
                    "Your subscription activates after payment confirmation."
                );
        }

        let response = "";

        switch (message) {
            case "":
                response =
                    "CON Welcome to Safety Tips\n" +
                    "1. Subscribe\n" +
                    "2. Unsubscribe\n" +
                    "3. Check Status\n" +
                    "4. Today's Safety Tip";
                break;

            case "1":
                response =
                    "CON Select Subscription\n" +
                    "1. Daily Tips - GHS 1\n" +
                    "2. Weekly Tips - GHS 5\n" +
                    "3. Monthly Tips - GHS 15";
                break;

            case "2":
                response =
                    "END Unsubscribe is not yet implemented.";
                break;

            case "3":
                response =
                    "END Subscription status checking is not yet implemented.";
                break;

            case "4": {
                const tip = await getRandomTip();

                response = tip
                    ? `END Safety Tip:\n${tip.message || tip.tip || tip.title}`
                    : "END No safety tips are available right now.";

                break;
            }

            default: {
                const selected = subscriptions[message];

                if (!selected) {
                    response = "END Invalid option.";
                    break;
                }

                // Prefix detection is a fallback, not proof of current network.
                const network = detectNetwork(phone);
                const channel = getHubtelChannel(network);

                const invoice = await createInvoice({
                    phone,
                    amount: selected.amount,
                    description:
                        `${selected.name} Safety Tips Subscription`,
                    interval: selected.interval,
                    channel
                });

                console.log("Recurring invoice created:", {
                    phone,
                    network,
                    interval: selected.interval,
                    recurringInvoiceId: invoice.recurringInvoiceId,
                    requestId: invoice.requestId
                });

                response =
                    "CON " + selected.name +
                    " subscription selected.\n" +
                    "Enter the verification code sent to your phone.\n" +
                    "Type OTP* followed by your code.";
                break;
            }
        }

        return res.status(200).send(response);

    }  catch (error) {
    console.error("USSD ERROR:", error.message);

    if (error.response) {
        console.error("HUBTEL STATUS:", error.response.status);
        console.error(
            "HUBTEL RESPONSE:",
            JSON.stringify(error.response.data, null, 2)
        );
    }

    res.status(200).type("text/plain").send(
        "END We could not process your request. Please try again later."
    );
}
};
