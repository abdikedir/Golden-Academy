import dotenv from "dotenv";

dotenv.config();

const parseCorsOrigins = (value) => {
  const source =
    value ||
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000";
  if (source.trim() === "*") return ["*"];
  return source
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  dbUri: process.env.DB_URI,
  jwtSecret: process.env.JWT_SECRET || "change-me-in-env",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN),
};
