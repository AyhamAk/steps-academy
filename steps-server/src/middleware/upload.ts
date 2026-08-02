import { randomUUID } from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

export const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

function imageFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image uploads are allowed"));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});
