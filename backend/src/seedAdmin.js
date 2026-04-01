import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDb } from "./config/db.js";
import { User } from "./models/User.js";

dotenv.config();

const run = async () => {
  await connectDb();

  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "Admin123!";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin already exists", email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await User.create({
    name: "Platform Admin",
    email,
    passwordHash,
    role: "admin",
    subscription: {
      status: "active",
      plan: "yearly",
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });

  console.log("Admin created", email);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
