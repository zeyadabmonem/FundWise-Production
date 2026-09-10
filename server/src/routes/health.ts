import { Router } from "express";
import { isPostgresActive } from "../db/connection.js";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    database: isPostgresActive ? "postgresql" : "in-memory-fallback",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
