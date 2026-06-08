import bcrypt from "bcryptjs";
import { runMigrations } from "./migrate.js";
import * as Users from "../models/user.model.js";
import { logger } from "../utils/logger.js";

/**
 * Seed a demo customer account for local testing.
 *   email: demo@zenmotionpeace.com
 *   password: demopass123
 */
async function seed() {
  runMigrations();

  const email = "demo@zenmotionpeace.com";
  if (!Users.findByEmail(email)) {
    const passwordHash = await bcrypt.hash("demopass123", 12);
    Users.create({ email, name: "Demo Customer", passwordHash });
    logger.info(`Seeded demo user: ${email} / demopass123`);
  } else {
    logger.info("Demo user already exists — nothing to seed.");
  }
  process.exit(0);
}

seed();
