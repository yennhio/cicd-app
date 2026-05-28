// creates web server app instance
const express = require("express");
const incidents = require("./src/routes/incidents");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
	res.send("Hello CI/CD");
});

app.use("/incidents", incidents);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
