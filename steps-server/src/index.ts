import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { runDevSeed } from "./devSeed";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { UPLOADS_DIR } from "./middleware/upload";
import announcementRoutes from "./routes/announcementRoutes";
import authRoutes from "./routes/authRoutes";
import galleryRoutes from "./routes/galleryRoutes";
import gamesRoutes from "./routes/gamesRoutes";
import profileRoutes from "./routes/profileRoutes";
import shopRoutes from "./routes/shopRoutes";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "Steps API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/announcements", announcementRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Steps API listening on port ${env.port}`);
  void runDevSeed();
});
