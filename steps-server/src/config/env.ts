import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT ?? 4000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-insecure-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
};
