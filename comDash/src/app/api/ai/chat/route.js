import { streamText, embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { pgTable, text, varchar, vector } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, cosineDistance, desc } from "drizzle-orm";
import postgres from "postgres";

const connectionString = "postgresql://postgres:erpq-postgres@db:5432/erpq";
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
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    const { embedding } = await embed({
      model: ollama.embedding("nomic-embed-text"),
      value: lastUserMessage,
    });

    // THE FIX: Stringify the array so it keeps the [ ] brackets for pgvector
    const embeddingString = JSON.stringify(embedding);
    
    const similarity = sql`1 - (${cosineDistance(frappeDocs.embedding, embeddingString)})`;
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

    // Pure, native text stream
    return new Response(result.textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unknown Error" }), { status: 500 });
  }
}