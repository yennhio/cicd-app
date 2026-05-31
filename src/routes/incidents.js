const express = require("express");
const db = require("../db/db");

const router = express.Router();

router.post("/", async (req, res) => {
  const { title, severity } = req.body;
  
if (!title || !severity) {
  return res.status(400).json({ error: "Missing fields" });
}

try {
  const result = await db.query(
    "INSERT INTO incidents (title, severity) VALUES ($1, $2) RETURNING *",
    [title, severity]
  );

  res.json(result.rows[0]);
  console.log("Creating incident:", title);
} catch (err) {
    console.error("Failed to create incident:", err);
    res.status(500).json({error: "Failed to create incident" });
 }
});

router.get("/", async (req, res) => {
  try { 
    const result = await db.query(
      "SELECT * FROM incidents ORDER BY id DESC"
    );

  res.json(result.rows);
} catch (err) {
  console.error("Failed to fetch incidents:", err);
  res.status(500).json({error: "Failed to fetch incidents" });
}
});


router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status){
    return res.status(400).json({error: "Missing status field"});
}

  try {
    const result = await db.query(
      "UPDATE incidents SET status=$1 WHERE id=$2 RETURNING *",
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Incident not found" });
    }
 
    console.log("Updating incident:", id, status);
    res.json(result.rows[0]);
  
   } catch (err) {
     console.error("Failed to update incident:", err);
     res.status(500).json({ error: "Failed to update incident" });
  }
});

module.exports = router;
