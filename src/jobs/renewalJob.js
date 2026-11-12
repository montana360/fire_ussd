
const cron = require("node-cron");
const db = require("../db/connection");

cron.schedule("0 1 * * *", async () => {
    console.log("Checking subscriptions due for expiry...");

    try {
        const [result] = await db.query(`
            UPDATE subscribers
            SET status = 'EXPIRED'
            WHERE status = 'ACTIVE'
              AND expiry_date < CURDATE()
        `);

        console.log(
            `${result.affectedRows} expired subscriptions updated.`
        );

    } catch (error) {
        console.error("Renewal job error:", error.message);
    }
});
