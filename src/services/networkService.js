
function normalizePhone(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (number.startsWith("0") && number.length === 10) {
        number = "233" + number.substring(1);
    }

    if (!/^233\d{9}$/.test(number)) {
        throw new Error("Invalid Ghanaian mobile number");
    }

    return number;
}

function detectNetwork(phone) {
    const number = normalizePhone(phone);
    const localNumber = "0" + number.substring(3);
    const prefix = localNumber.substring(0, 3);

    // Original number allocations only; not reliable after porting.
    const mtnPrefixes = [
        "024", "025", "053", "054", "055",
        "059", "023", "056"
    ];

    const telecelPrefixes = [
        "020", "050"
    ];

    if (mtnPrefixes.includes(prefix)) {
        return "MTN";
    }

    if (telecelPrefixes.includes(prefix)) {
        return "TELECEL";
    }

    throw new Error(
        "Network could not be determined from this phone number"
    );
}

function getHubtelChannel(network) {
    switch (network) {
        case "MTN":
            return "mtn_gh_rec";

        case "TELECEL":
            return "vodafone_gh_rec";

        default:
            throw new Error("Unsupported mobile money network");
    }
}

module.exports = {
    normalizePhone,
    detectNetwork,
    getHubtelChannel
};
