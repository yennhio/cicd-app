const app = require("./app");
const { waitForDB, initDB } = require("./src/db/init");

async function startServer() {
  try {
    await waitForDB();   // 👈 FIRST
    await initDB();      // 👈 THEN schema

    app.listen(3000, () => {
      console.log("Server running");
    });

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

startServer();
