export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  authIssuerUrl: process.env.AUTH_ISSUER_URL ?? "",
  erpnextBaseUrl: process.env.ERPNEXT_BASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
};
