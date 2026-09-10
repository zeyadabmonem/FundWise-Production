import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal Server Error";
  logger.error({ err, url: req.url, method: req.method }, "Unhandled API Error");

  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : message,
  });
}
