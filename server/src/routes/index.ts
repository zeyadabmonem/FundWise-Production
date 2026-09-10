import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import transactionsRouter from "./transactions.js";
import aiRouter from "./ai.js";
import dashboardRouter from "./dashboard.js";
import overridesRouter from "./overrides.js";
import adminRouter from "./admin.js";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(overridesRouter);
router.use("/ai", aiRouter);
router.use(adminRouter);

export default router;
