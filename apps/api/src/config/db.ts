import mongoose from "mongoose";
import { env } from "./env";

let connectPromise: Promise<typeof mongoose> | null = null;

export function connectDb() {
  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose.connect(env.MONGODB_URI);
  }
  return connectPromise;
}
