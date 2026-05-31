const request = require("supertest");
const app = require("../app");
const pool = require("../src/db/db");

// runs once before all tests — sets up the table
beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
});

// runs once after all tests — drops table and closes DB connection
afterAll(async () => {
  await pool.query("DROP TABLE IF EXISTS incidents;");
  await pool.end();
});

// runs before each test — keeps tests from affecting each other
beforeEach(async () => {
  await pool.query("DELETE FROM incidents;");
});

describe("GET /health", () => {
  test("returns status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("POST /incidents", () => {
  test("creates an incident", async () => {
    const res = await request(app)
      .post("/incidents")
      .send({ title: "Server down", severity: "high" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Server down");
    expect(res.body.severity).toBe("high");
    expect(res.body.status).toBe("open"); // default status should be open
    expect(res.body.id).toBeDefined();
  });

  // missing fields should return 400
  test("returns 400 if title is missing", async () => {
    const res = await request(app).post("/incidents").send({ severity: "high" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing fields");
  });

  test("returns 400 if severity is missing", async () => {
    const res = await request(app).post("/incidents").send({ title: "Server down" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing fields");
  });

  test("returns 400 if body is empty", async () => {
    const res = await request(app).post("/incidents").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing fields");
  });
});

describe("GET /incidents", () => {
  test("returns empty array when no incidents exist", async () => {
    const res = await request(app).get("/incidents");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("returns incidents in descending order", async () => {
    // create two incidents so we can check the order
    await request(app).post("/incidents").send({ title: "First", severity: "low" });
    await request(app).post("/incidents").send({ title: "Second", severity: "high" });

    const res = await request(app).get("/incidents");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].title).toBe("Second"); // most recent first
    expect(res.body[1].title).toBe("First");
  });
});

describe("PATCH /incidents/:id", () => {
  test("updates incident status", async () => {
    // create an incident first so we have an id to patch
    const created = await request(app)
      .post("/incidents")
      .send({ title: "Server down", severity: "high" });

    const res = await request(app)
      .patch(`/incidents/${created.body.id}`)
      .send({ status: "resolved" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("resolved");
  });

  test("returns 400 if status is missing", async () => {
    const created = await request(app)
      .post("/incidents")
      .send({ title: "Server down", severity: "high" });

    const res = await request(app)
      .patch(`/incidents/${created.body.id}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing status field");
  });

  // 99999 is a fake id that won't exist in the test db
  test("returns 404 if incident does not exist", async () => {
    const res = await request(app)
      .patch("/incidents/99999")
      .send({ status: "resolved" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Incident not found");
  });
});
