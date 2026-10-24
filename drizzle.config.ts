import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
