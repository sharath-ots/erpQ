import pg from "pg";
import { env } from "../config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: Number(process.env.DOCQ_PG_POOL_MAX ?? 10),
});

