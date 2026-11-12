const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("Safety Tips API Running 🚀");
});

// USSD Route
const ussdRoutes = require("./routes/ussdRoutes");
app.use("/ussd", ussdRoutes);

module.exports = app;