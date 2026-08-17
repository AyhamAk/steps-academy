import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { runDevSeed } from "./devSeed";
import { scheduleAnalyticsPurge } from "./lib/analyticsRetention";
import { scheduleCourseCleanup } from "./lib/courseCleanup";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { requestTelemetry } from "./middleware/requestTelemetry";
import announcementRoutes from "./routes/announcementRoutes";
import authRoutes from "./routes/authRoutes";
import courseRoutes from "./routes/courseRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";
import galleryRoutes from "./routes/galleryRoutes";
import inviteRoutes from "./routes/inviteRoutes";
import gamesRoutes from "./routes/gamesRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import profileRoutes from "./routes/profileRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import legalRoutes from "./routes/legalRoutes";
import shopRoutes from "./routes/shopRoutes";
import studentRoutes from "./routes/studentRoutes";

const app = express();

// Railway (and any platform proxy) terminates TLS and forwards the real client
// IP in X-Forwarded-For. Without this, every request looks like it came from
// the proxy, so the auth rate limiter would treat the whole academy as one
// client and a few failed logins would lock everyone out. Trust only the
// immediate hop — `true` would let a client forge its own IP via the header.
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// Native mobile clients don't send an Origin header, so this mainly matters
// if a web client is ever added. Set CORS_ORIGIN (comma-separated) once
// there's a real production domain; open in dev since there isn't one yet.
app.use(cors(env.corsOrigin ? { origin: env.corsOrigin.split(",").map((o) => o.trim()) } : {}));
app.use(morgan("dev"));
app.use(express.json());
app.use(requestTelemetry);
// Photos now live on Cloudflare R2, served via short-lived signed URLs
// generated per-request — nothing is served directly from this process.

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "Steps API" });
});

// Public web pages the app stores require. No auth, no data.
app.use("/", legalRoutes);
app.use("/dashboard", dashboardRoutes);

app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Steps API listening on port ${env.port}`);
  void runDevSeed();
  scheduleCourseCleanup();
  scheduleAnalyticsPurge();
});
