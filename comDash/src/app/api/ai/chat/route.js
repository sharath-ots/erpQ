import { streamText, embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { pgTable, text, varchar, vector } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, desc } from "drizzle-orm";
import postgres from "postgres";

// 1. Dynamically grab the password from the Docker environment
const dbUser = process.env.POSTGRES_USER || "postgres";
const dbPass = process.env.POSTGRES_PASSWORD || "erpq-postgres";
const dbName = process.env.POSTGRES_DB || "erpq";

// Connect via Docker internal network
const connectionString = `postgresql://${dbUser}:${dbPass}@db:5432/${dbName}`;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

const frappeDocs = pgTable("frappe_docs", {
  id: varchar("id", { length: 191 }).primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }).notNull(),
});

const ollama = createOpenAI({
  baseURL: "http://erpq-ollama:11434/v1",
  apiKey: "ollama",
});

export async function POST(req) {
  try {
    // 2. 🛠️ AUTO-HEAL: Create the extension and table if they are missing!
    try {
        await client`CREATE EXTENSION IF NOT EXISTS vector;`;
        await client`
          CREATE TABLE IF NOT EXISTS frappe_docs (
            id VARCHAR(191) PRIMARY KEY,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding vector(768) NOT NULL
          );
        `;
    } catch(dbInitErr) {
        console.log("⚠️ Auto-heal note (safe to ignore if query works):", dbInitErr.message);
    }

    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    const { embedding } = await embed({
      model: ollama.embedding("nomic-embed-text"),
      value: lastUserMessage,
    });

    const vectorLiteral = `'[${embedding.join(",")}]'`;
    const similarity = sql`1 - (${frappeDocs.embedding} <=> ${sql.raw(vectorLiteral)}::vector)`;
    
    const relevantDocs = await db
      .select({ title: frappeDocs.title, content: frappeDocs.content })
      .from(frappeDocs)
      .orderBy(desc(similarity))
      .limit(5);

    const contextText = relevantDocs.map((doc) => `[${doc.title}]: ${doc.content}`).join("\n\n");

    const result = await streamText({
      model: ollama("llama3.2:1b"),
      temperature: 0, 
      system: `You are a helpful and factual ERP assistant. 
      Read the Context below. If the Context contains information related to the user's question, use it to generate a clear, step-by-step answer. 
      Do not use outside knowledge. If the Context is completely unrelated to the question, say "I do not have enough information in my knowledge base to answer that."
      Context:
      ${contextText}`,
      messages,
    });

    return new Response(result.textStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    // 3. 💥 Log the EXACT cause so we don't have to guess
    console.error("\n❌ Backend Error:", error.message);
    console.error("🔍 EXACT CAUSE:", error.cause?.message || error.cause || "No deeper cause provided");
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}