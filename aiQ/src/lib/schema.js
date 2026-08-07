// lib/schema.js
import { pgTable, text, varchar, vector, index } from 'drizzle-orm/pg-core';
import { nanoid } from 'ai';

export const frappeDocs = pgTable(
  'frappe_docs',
  {
    // A unique random ID for each row
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
    
    // The title of the Frappe doc page
    title: text('title').notNull(),
    
    // The URL so the chatbot can provide source links
    url: text('url').notNull(),
    
    // The actual text paragraph
    content: text('content').notNull(),
    
    // The vector column (1536 is the dimension for OpenAI's text-embedding-3-small)
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
  },
  (table) => [
    // HNSW index makes searching a million vectors incredibly fast
    index('embeddingIndex').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  ]
);