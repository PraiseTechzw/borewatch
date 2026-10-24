export const ENV = {
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
  get ownerEmail() { return (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(); },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get neonAuthBaseUrl() { return process.env.NEON_AUTH_BASE_URL ?? ""; },
  get neonAuthJwksUrl() { return process.env.NEON_AUTH_JWKS_URL ?? ""; },
  get storageBucket() { return process.env.NEON_STORAGE_BUCKET ?? "assets"; },
};
