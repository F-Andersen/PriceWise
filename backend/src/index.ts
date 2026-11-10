import "dotenv/config";
import cors from "cors";
import express from "express";
// Express 4 ignores rejected promises from async handlers: without this a bad
// request body would never reach the error handler (and could crash the process).
import "express-async-errors";
import morgan from "morgan";
import { ZodError } from "zod";
import { config } from "./config";
import { rateLimit } from "./middleware/rateLimit";
import { startPriceScheduler } from "./modules/priceMonitoring/priceScheduler";
import { syncRecipes } from "./services/recipeService";
import { prisma } from "./prisma";
import authRoutes from "./routes/auth";
import offerRoutes from "./routes/offers";
import priceRoutes from "./routes/prices";
import productRoutes from "./routes/products";
import recipeRoutes from "./routes/recipes";
import shoppingListRoutes from "./routes/shoppingLists";
import storeRoutes from "./routes/stores";

const app = express();

app.disable("x-powered-by");
if (config.trustProxy) app.set("trust proxy", 1);
if (config.corsOrigins) app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use(morgan(config.isProduction ? "combined" : "dev"));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "price-monitoring-backend" });
  } catch {
    res.status(503).json({ ok: false, message: "Database unavailable" });
  }
});
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), authRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/prices", priceRoutes);
app.use("/api/shopping-lists", shoppingListRoutes);
app.use("/api/recipes", recipeRoutes);

app.use("/api", (_req, res) => res.status(404).json({ message: "Not found" }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Invalid request", issues: err.issues.map((issue) => ({ path: issue.path, message: issue.message })) });
  }
  const message = err instanceof Error ? err.message : "Unexpected server error";
  const prismaCode = (err as { code?: string } | null)?.code;
  if (/not found/i.test(message) || prismaCode === "P2025") return res.status(404).json({ message: "Not found" });
  // Don't leak database or stack details to clients in production.
  console.error(err);
  return res.status(500).json({ message: config.isProduction ? "Unexpected server error" : message });
});

const server = app.listen(config.port, () => {
  console.log(`API is running on port ${config.port}${config.isProduction ? " (production)" : ""}`);
  startPriceScheduler();
  syncRecipes().catch((error) => console.error("Recipe sync failed", error));
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
