import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { runDevSeed } from "./devSeed";
import { errorHandler, notFound } from "./middleware/errorHandler";
import announcementRoutes from "./routes/announcementRoutes";
import authRoutes from "./routes/authRoutes";
import courseRoutes from "./routes/courseRoutes";
import galleryRoutes from "./routes/galleryRoutes";
import gamesRoutes from "./routes/gamesRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import profileRoutes from "./routes/profileRoutes";
import shopRoutes from "./routes/shopRoutes";
import studentRoutes from "./routes/studentRoutes";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// Native mobile clients don't send an Origin header, so this mainly matters
// if a web client is ever added. Set CORS_ORIGIN (comma-separated) once
// there's a real production domain; open in dev since there isn't one yet.
app.use(cors(env.corsOrigin ? { origin: env.corsOrigin.split(",").map((o) => o.trim()) } : {}));
app.use(morgan("dev"));
app.use(express.json());
// Photos now live on Cloudflare R2, served via short-lived signed URLs
// generated per-request — nothing is served directly from this process.

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "Steps API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Steps API listening on port ${env.port}`);
  void runDevSeed();
});
