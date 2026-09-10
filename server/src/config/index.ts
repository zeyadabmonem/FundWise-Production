import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env from server directory or root directory
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().default("fundwise-production-secure-session-secret-key-32-chars-min!"),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ADMIN_EMAILS: z.string().default("admin@fundwise.eg,admin@example.com"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

export const isAdminEmail = (email: string): boolean => {
  const adminList = config.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminList.includes(email.toLowerCase());
};
