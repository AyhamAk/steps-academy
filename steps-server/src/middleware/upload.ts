import multer from "multer";

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

// Buffers stay in memory only long enough to be resized (sharp) and pushed to
// R2 — nothing is ever written to local disk, since the process running this
// isn't a durable place to keep photos.
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
});
