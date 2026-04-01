import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { connectDb } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import scoreRoutes from "./routes/scores.js";
import charityRoutes from "./routes/charities.js";
import drawRoutes from "./routes/draws.js";
import dashboardRoutes from "./routes/dashboard.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import winnerRoutes from "./routes/winners.js";
import reportRoutes from "./routes/reports.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use("/api/subscriptions/webhook", stripeWebhookRoutes);
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/charities", charityRoutes);
app.use("/api/draws", drawRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/winners", winnerRoutes);
app.use("/api/reports", reportRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start API", error);
    process.exit(1);
  });
