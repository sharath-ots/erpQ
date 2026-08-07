import fs from "fs";
import path from "path";
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { pgTable, text, varchar, vector } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// 🔴 Update your database password here!
const connectionString = "postgresql://postgres:erpq-postgres@localhost:5432/erpq";
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
  baseURL: "http://localhost:11434/v1", // Localhost since we run this from the host machine
  apiKey: "ollama",
});

// Helper function to split large files into smaller paragraphs
function chunkText(text, minChunkSize = 50) {
  return text
    .split(/\n\n+/) // Split by double line breaks (paragraphs)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > minChunkSize); // Ignore tiny fragments
}

async function runIngestion() {
  console.log("🚀 Starting Bulk Document Ingestion...");
  const docsDir = path.join(process.cwd(), "scripts", "docs");

  try {
    const files = fs.readdirSync(docsDir);
    
    if (files.length === 0) {
      console.log("⚠️ No files found in scripts/docs/");
      process.exit(0);
    }

    for (const file of files) {
      if (!file.endsWith(".txt") && !file.endsWith(".md")) continue;

      console.log(`\n📄 Processing file: ${file}`);
      const filePath = path.join(docsDir, file);
      const rawText = fs.readFileSync(filePath, "utf-8");
      
      const chunks = chunkText(rawText);
      console.log(`✂️ Split into ${chunks.length} chunks.`);

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const chunkId = `${file}-chunk-${i}-${Date.now()}`;

        console.log(`   🧠 Vectorizing chunk ${i + 1}/${chunks.length}...`);
        
        const { embedding } = await embed({
          model: ollama.embedding("nomic-embed-text"),
          value: chunkContent,
        });

        const embeddingString = JSON.stringify(embedding);

        console.log(`   💾 Saving to PostgreSQL...`);
        await client`
          INSERT INTO frappe_docs (id, title, url, content, embedding)
          VALUES (
            ${chunkId}, 
            ${file}, 
            ${`local://docs/${file}`}, 
            ${chunkContent}, 
            ${embeddingString}::vector
          )
        `;
      }
      console.log(`✅ Finished ${file}`);
    }

    console.log("\n🎉 All documents successfully ingested!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ingestion Failed:", error);
    process.exit(1);
  }
}

runIngestion();