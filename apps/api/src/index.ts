import { env } from "./config/env";
import { connectDb } from "./config/db";
import { app } from "./app";
import { engine } from "./lib/socket";

await connectDb();

export default {
  port: env.PORT,
  ...engine.handler(),
  fetch: app.fetch,
};
