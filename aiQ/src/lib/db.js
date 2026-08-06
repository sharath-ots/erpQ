// lib/db.js
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Ensure this environment variable is set in your .env file
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing in .env");
}

// Create the Postgres connection (disable prepared statements for serverless/Next.js)
const client = postgres(connectionString, { prepare: false });

// Initialize Drizzle ORM with the connection
export const db = drizzle(client);