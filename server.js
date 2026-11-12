require("dotenv").config();
require("./src/jobs/sendTipsJob");
const app = require("./src/app");
const db = require("./src/db/connection");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const connection = await db.getConnection();

    console.log("MySQL Connected Successfully");

    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error(error);
  }
}

startServer();