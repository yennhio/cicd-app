const pool = require("./db");

async function waitForDB(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      console.log("DB not ready yet... retrying");
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error("DB never became ready");
}

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

module.exports = { waitForDB, initDB };
