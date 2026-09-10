import { Router } from "express";
import { dashboardService } from "../services/dashboardService.js";
import { requireUser } from "../middlewares/auth.js";

const router = Router();
router.use(requireUser);

router.get("/dashboard/summary", async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary(req.user!.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
