// require("dotenv").config();
// require("./src/jobs/sendTipsJob");
// const app = require("./src/app");
// const db = require("./src/db/connection");

// const PORT = process.env.PORT || 3000;


// async function startServer() {
//   try {
//     const connection = await db.getConnection();

//     console.log("MySQL Connected Successfully");

//     connection.release();

//     app.listen(PORT,"0.0.0.0", () => {
//       console.log(`Server running on port ${PORT}`);
//     });

//   } catch (error) {
//     console.error(error);
//   }
// }

// startServer();


require("dotenv").config();

const app = require("./src/app");
const db = require("./src/db/connection");

const PORT = process.env.PORT || 3000;

// Start HTTP server immediately so Render can detect the port.
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Check MySQL separately. The HTTP server stays available if DB is offline.
async function checkDatabase() {
  let connection;

  try {
    connection = await db.getConnection();
    console.log("MySQL Connected Successfully");
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
  } finally {
    if (connection) connection.release();
  }
}

checkDatabase();

// Enable scheduled jobs only when explicitly configured.
// Render free services are not suitable for reliable continuous cron execution.
if (process.env.ENABLE_CRON === "true") {
  require("./src/jobs/sendTipsJob");
  console.log("Scheduled jobs enabled");
} else {
  console.log("Scheduled jobs disabled");
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Closing application...");

  server.close(async () => {
    await db.end();
    process.exit(0);
  });
});
