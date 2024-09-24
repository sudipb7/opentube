require("dotenv").config();

export const { NODE_ENV, PORT, JWT_SECRET_KEY, LOG_FORMAT, LOG_DIR } = process.env;
