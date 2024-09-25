require("dotenv").config();

export const { NODE_ENV, PORT, JWT_SECRET_KEY, LOG_FORMAT, LOG_DIR, CORS_ORIGINS, RESEND_API_KEY, RESEND_MAIL_ID } =
  process.env;
