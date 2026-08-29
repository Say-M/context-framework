import mongoose, { type ClientSession } from "mongoose";
import { env } from "./env";

let connectPromise: Promise<typeof mongoose> | null = null;

export function connectDb() {
  if (!connectPromise) {
    mongoose.set("strictQuery", true);
    connectPromise = mongoose.connect(env.MONGODB_URI);
  }
  return connectPromise;
}

/**
 * Runs `fn` inside a real MongoDB multi-document transaction — every write
 * `fn` makes must pass `{ session }` (or `.session(session)`) through to
 * take part in it. Requires MongoDB to be running as a replica set;
 * transactions don't exist on a standalone server, and this throws
 * immediately if it isn't one rather than silently running non-atomically.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}
