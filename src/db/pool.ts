import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && !process.env.PGHOST) {
  throw new Error("Set DATABASE_URL or PGHOST and the PG* connection variables");
}

export const pool = connectionString
  ? new Pool({ connectionString })
  : new Pool();
