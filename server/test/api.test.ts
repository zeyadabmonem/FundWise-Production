import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SESSION_COOKIE } from "../src/middlewares/auth.js";

const app = createApp();

describe("FundWise Production API Suite", () => {
  let memberCookie = "";
  let adminCookie = "";
  let createdTransactionId = "";

  it("GET /api/healthz should return status ok", async () => {
    const res = await request(app).get("/api/healthz");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.ok(res.body.database);
  });

  describe("Authentication Flow", () => {
    it("POST /api/auth/register should create a new member user and issue session cookie", async () => {
      const email = `testuser_${Date.now()}@fundwise.eg`;
      const res = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email,
        password: "securepassword123",
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.email, email);
      assert.equal(res.body.role, "member");

      const cookies = res.headers["set-cookie"] as unknown as string[];
      assert.ok(cookies && cookies.some((c: string) => c.includes(SESSION_COOKIE)));
      memberCookie = cookies.find((c: string) => c.includes(SESSION_COOKIE))!.split(";")[0];
    });

    it("GET /api/auth/me should return 401 without session cookie", async () => {
      const res = await request(app).get("/api/auth/me");
      assert.equal(res.status, 401);
    });

    it("GET /api/auth/me should return user with valid session cookie", async () => {
      const res = await request(app).get("/api/auth/me").set("Cookie", memberCookie);
      assert.equal(res.status, 200);
      assert.equal(res.body.name, "Test User");
    });

    it("POST /api/auth/login should authenticate seeded demo user", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "demo@fundwise.eg",
        password: "password123",
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.email, "demo@fundwise.eg");
    });

    it("POST /api/auth/login should authenticate seeded admin user", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "admin@fundwise.eg",
        password: "password123",
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.role, "admin");

      const cookies = res.headers["set-cookie"] as unknown as string[];
      adminCookie = cookies.find((c: string) => c.includes(SESSION_COOKIE))!.split(";")[0];
    });
  });

  describe("Transactions Flow", () => {
    it("POST /api/transactions should create a transaction and learn merchant category", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .set("Cookie", memberCookie)
        .send({
          merchant: "Carrefour Maadi",
          amount: 850.5,
          category: "Groceries",
          date: new Date().toISOString(),
          captureChannel: "manual",
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.merchant, "Carrefour Maadi");
      assert.equal(res.body.amount, 850.5);
      assert.equal(res.body.category, "Groceries");
      createdTransactionId = res.body.id;
    });

    it("GET /api/transactions should return list of transactions", async () => {
      const res = await request(app).get("/api/transactions").set("Cookie", memberCookie);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.some((t: any) => t.id === createdTransactionId));
    });

    it("PATCH /api/transactions/:id should update a transaction", async () => {
      const res = await request(app)
        .patch(`/api/transactions/${createdTransactionId}`)
        .set("Cookie", memberCookie)
        .send({
          amount: 900.0,
          notes: "Updated weekly groceries",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.amount, 900.0);
      assert.equal(res.body.notes, "Updated weekly groceries");
    });
  });

  describe("Dashboard Summary Flow", () => {
    it("GET /api/dashboard/summary should return calculated month-over-month spend and AI insights", async () => {
      const res = await request(app).get("/api/dashboard/summary").set("Cookie", memberCookie);
      assert.equal(res.status, 200);
      assert.ok(typeof res.body.currentMonthSpend === "number");
      assert.ok(typeof res.body.monthOverMonthChangePct === "number");
      assert.ok(Array.isArray(res.body.insights));
      assert.ok(res.body.insights.length > 0);
    });
  });

  describe("Merchant Overrides Flow", () => {
    it("GET /api/merchant-overrides should return user overrides", async () => {
      const res = await request(app).get("/api/merchant-overrides").set("Cookie", memberCookie);
      assert.equal(res.status, 200);
      assert.equal(res.body["carrefour maadi"], "Groceries");
    });

    it("POST /api/merchant-overrides should upsert custom merchant category", async () => {
      const res = await request(app)
        .post("/api/merchant-overrides")
        .set("Cookie", memberCookie)
        .send({
          merchant: "Local Coffee Shop",
          category: "Food & Drink",
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.category, "Food & Drink");
    });
  });

  describe("AI Endpoints Security & Categorization", () => {
    it("POST /api/ai/categorize should reject unauthenticated requests with 401", async () => {
      const res = await request(app).post("/api/ai/categorize").send({ merchant: "Starbucks" });
      assert.equal(res.status, 401);
    });

    it("POST /api/ai/categorize should categorize known merchant with confidence", async () => {
      const res = await request(app)
        .post("/api/ai/categorize")
        .set("Cookie", memberCookie)
        .send({ merchant: "Starbucks" });

      assert.equal(res.status, 200);
      assert.equal(res.body.category, "Food & Drink");
      assert.ok(["high", "medium", "low"].includes(res.body.confidence));
    });

    it("POST /api/ai/categorize should use user database override before AI", async () => {
      const res = await request(app)
        .post("/api/ai/categorize")
        .set("Cookie", memberCookie)
        .send({ merchant: "Carrefour Maadi" });

      assert.equal(res.status, 200);
      assert.equal(res.body.category, "Groceries");
      assert.equal(res.body.confidence, "high");
    });
  });

  describe("Admin Access Control", () => {
    it("GET /api/admin/overview should reject regular member with 403", async () => {
      const res = await request(app).get("/api/admin/overview").set("Cookie", memberCookie);
      assert.equal(res.status, 403);
      assert.equal(res.body.error, "Administrator role required");
    });

    it("GET /api/admin/overview should allow admin user", async () => {
      const res = await request(app).get("/api/admin/overview").set("Cookie", adminCookie);
      assert.equal(res.status, 200);
      assert.ok(res.body.metrics);
      assert.ok(Array.isArray(res.body.transactions));
      assert.ok(Array.isArray(res.body.users));
    });
  });
});
