import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import offerRoutes from "./routes/offers";
import priceRoutes from "./routes/prices";
import productRoutes from "./routes/products";
import recipeRoutes from "./routes/recipes";
import shoppingListRoutes from "./routes/shoppingLists";
import storeRoutes from "./routes/stores";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "price-monitoring-backend" }));
app.use("/api/auth", authRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/prices", priceRoutes);
app.use("/api/shopping-lists", shoppingListRoutes);
app.use("/api/recipes", recipeRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Unexpected server error";
  const status = message.includes("not found") ? 404 : 400;
  res.status(status).json({ message });
});

app.listen(port, () => {
  console.log(`API is running on http://localhost:${port}`);
});
