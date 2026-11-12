
const cron = require("node-cron");
const db = require("../db/connection");
const { getRandomTip } = require("../services/tipService");
const { sendSMS } = require("../services/smsService");

cron.schedule("0 8 * * *", async () => {
    console.log("Sending scheduled safety tips...");

    try {
        const tip = await getRandomTip();

        if (!tip) {
            console.log("No safety tips found in the database.");
            return;
        }

        // Your tipService returns a row with a `message` field.
        const tipMessage = tip.message || tip.tip || tip.title;

        if (!tipMessage) {
            console.error("The selected safety tip has no message.");
            return;
        }

        const [subs] = await db.query(`
            SELECT id, phone, subscription_type
            FROM subscribers
            WHERE status = 'ACTIVE'
              AND next_tip_date <= CURDATE()
              AND expiry_date >= CURDATE()
            ORDER BY id ASC
        `);

        console.log(`${subs.length} subscribers are due for tips.`);

        for (const sub of subs) {
            try {
                await sendSMS(sub.phone, tipMessage);

                let sql;

                switch (sub.subscription_type) {
                    case "DAILY":
                        sql = `
                            UPDATE subscribers
                            SET next_tip_date =
                                DATE_ADD(CURDATE(), INTERVAL 1 DAY)
                            WHERE id = ?
                        `;
                        break;

                    case "WEEKLY":
                        sql = `
                            UPDATE subscribers
                            SET next_tip_date =
                                DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                            WHERE id = ?
                        `;
                        break;

                    case "MONTHLY":
                        sql = `
                            UPDATE subscribers
                            SET next_tip_date =
                                DATE_ADD(CURDATE(), INTERVAL 1 MONTH)
                            WHERE id = ?
                        `;
                        break;

                    default:
                        console.error(
                            `Unknown subscription type for subscriber ${sub.id}`
                        );
                        continue;
                }

                await db.query(sql, [sub.id]);

                console.log(`Safety tip sent to ${sub.phone}`);

            } catch (error) {
                console.error(
                    `Failed to send tip to subscriber ${sub.id}:`,
                    error.response?.data || error.message
                );
            }
        }

        console.log("Safety tips job completed.");

    } catch (error) {
        console.error("Safety tips job failed:", error.message);
    }
});
