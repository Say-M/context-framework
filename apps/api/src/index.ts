import { env } from "./config/env";
import { connectDb } from "./config/db";
import { app } from "./app";

await connectDb();

export default {
  port: env.PORT,
  fetch: app.fetch,
};
