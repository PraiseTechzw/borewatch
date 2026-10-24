export const ENV = {
  get databaseUrl() { return process.env.DATABASE_URL ?? ""; },
  get sessionSecret() { return process.env.SESSION_SECRET ?? ""; },
  get ownerEmail() { return (process.env.OWNER_EMAIL ?? "").trim().toLowerCase(); },
  get isProduction() { return process.env.NODE_ENV === "production"; },
  get forgeApiUrl() { return process.env.FORGE_API_URL ?? ""; },
  get forgeApiKey() { return process.env.FORGE_API_KEY ?? ""; },
};
