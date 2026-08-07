import "dotenv/config";
import { embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { pgTable, text, varchar, vector } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import crypto from "crypto";

// Connect to exposed Docker port on localhost
const connectionString = "postgresql://postgres:erpq-postgres@localhost:5432/erpq";
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

const frappeDocs = pgTable("frappe_docs", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  url: text("url").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
});

// Connect to exposed Ollama port on localhost
const ollama = createOpenAI({
  baseURL: "http://localhost:11434/v1", 
  apiKey: "ollama", 
});

const rawKnowledge = [
  {
    title: "Frappe Server Scripts",
    url: "https://docs.frappe.io/framework/user/en/desk/scripting/server-script",
    content: "Server Scripts allow you to write Python code that is executed on the server. You can use Server Scripts to customize ERPNext behavior without modifying the core codebase. They are triggered on document events like before_save or on_submit."
  },
  {
    title: "ERPNext Workflows",
    url: "https://docs.frappe.io/erpnext/workflow",
    content: "Workflows in ERPNext allow you to define multiple states for a document and the rules for transitioning between those states. For example, you can require a Manager approval before a Purchase Order can change from Draft to Submitted."
  }
];

async function seed() {
  console.log("Generating local embeddings via Ollama...");
  const { embeddings } = await embedMany({
    model: ollama.embedding("nomic-embed-text"),
    values: rawKnowledge.map(doc => doc.content),
  });

  console.log("Saving vectors to Postgres...");
  const records = rawKnowledge.map((doc, i) => ({
    title: doc.title,
    url: doc.url,
    content: doc.content,
    embedding: embeddings[i],
  }));

  await db.insert(frappeDocs).values(records);
  console.log("✅ Database seeded successfully!");
  process.exit(0);
}

seed().catch(console.error);