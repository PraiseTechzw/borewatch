import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let pool: Pool | undefined;
let database: ReturnType<typeof drizzle> | undefined;

export async function getDb() {
  if (!ENV.databaseUrl) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: ENV.databaseUrl,
      max: 10,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (error) => console.error("[Database] Unexpected idle client error:", error));
  }
  database ??= drizzle(pool);
  return database;
}

export async function syncNeonUser(input: {
  neonUserId: string;
  email: string;
  name: string | null;
  verifiedOwner: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available; configure DATABASE_URL");

  const values = {
    neonUserId: input.neonUserId,
    email: input.email.trim().toLowerCase(),
    name: input.name?.trim() || null,
    ...(input.verifiedOwner ? { role: "admin" as const } : {}),
    lastSignedIn: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.neonUserId,
    set: {
      email: values.email,
      name: values.name,
      ...(input.verifiedOwner ? { role: "admin" as const } : {}),
      lastSignedIn: values.lastSignedIn,
      updatedAt: values.updatedAt,
    },
  });

  const [user] = await db.select().from(users).where(eq(users.neonUserId, input.neonUserId)).limit(1);
  if (!user) throw new Error("Unable to synchronize Neon Auth user");
  return user;
}
