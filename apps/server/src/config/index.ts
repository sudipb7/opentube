require("dotenv").config();

export const {
  NODE_ENV,
  PORT,
  JWT_SECRET_KEY,
  LOG_FORMAT,
  LOG_DIR,
  CORS_ORIGINS,
  RESEND_API_KEY,
  RESEND_MAIL_ID,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} = process.env;

export const IS_PROD = NODE_ENV === "production";
export const APP_URL = IS_PROD ? process.env.APP_URL : `http://localhost:${PORT}`;
