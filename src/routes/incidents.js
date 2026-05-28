const express = require("express");
const db = require("../db/db");

const router = express.Router();

router.post("/", async (req, res) => {
  const { title, severity } = req.body;
  
if (!title || !severity) {
  return res.status(400).json({ error: "Missing fields" });
}

const result = await db.query(
  "INSERT INTO incidents (title, severity) VALUES ($1, $2) RETURNING *",
  [title, severity]
);

  res.json(result.rows[0]);

  console.log("Creating incident:", title);
});

router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM incidents ORDER BY id DESC"
  );

  res.json(result.rows);
});


router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
const result = await db.query(
    "UPDATE incidents SET status=$1 WHERE id=$2 RETURNING *",
    [status, id]
  );

  res.json(result.rows[0]);

  console.log("Updating incident:", id, status);
});

module.exports = router;
