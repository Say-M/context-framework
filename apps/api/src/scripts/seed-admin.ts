// One-off bootstrap: creates the very first admin account directly, since
// the invite flow requires an existing admin to invite anyone. Run with:
//   bun run src/scripts/seed-admin.ts <email> <password> <name>
import "../config/env";
import { connectDb } from "../config/db";
import { UserModel } from "@bismo/db-models";

const [, , email, password, name] = process.argv;
if (!email || !password || !name) {
  console.error("Usage: bun run src/scripts/seed-admin.ts <email> <password> <name>");
  process.exit(1);
}

await connectDb();

const passwordHash = await Bun.password.hash(password, "argon2id");
const user = await UserModel.create({
  email,
  name,
  passwordHash,
  role: "admin",
  status: "active",
});

console.log(`Seeded admin user ${user.email} (${user._id})`);
process.exit(0);
