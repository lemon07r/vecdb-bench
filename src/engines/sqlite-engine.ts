import { Database } from "bun:sqlite";
import { join } from "path";
import type { Document } from "../datasets";
import type { SearchEngine, SearchResult } from "../types";
import { EMBEDDING_DIM } from "../config";

function float32ArrayToBuffer(arr: number[]): Buffer {
  const f32 = new Float32Array(arr);
  return Buffer.from(f32.buffer);
}

function getVecExtensionPath(): string {
  // sqlite-vec npm packages use platform-specific dirs
  const candidates = [
    join(import.meta.dir, "../../node_modules/sqlite-vec-linux-x64/vec0"),
    join(import.meta.dir, "../../node_modules/sqlite-vec-linux-x86_64/vec0"),
    join(import.meta.dir, "../../node_modules/sqlite-vec-darwin-arm64/vec0"),
    join(import.meta.dir, "../../node_modules/sqlite-vec-darwin-x64/vec0"),
  ];
  for (const c of candidates) {
    try {
      const stat = Bun.file(c + ".so");
      // Just return the path without extension — bun:sqlite loadExtension adds it
      return c;
    } catch {}
  }
  // Try with .so explicitly
  for (const c of candidates) {
    if (require("fs").existsSync(c + ".so")) return c;
    if (require("fs").existsSync(c + ".dylib")) return c;
  }
  throw new Error("sqlite-vec extension not found");
}

export class SQLiteEngine implements SearchEngine {
  name = "SQLite + FTS5 + sqlite-vec";
  private db!: Database;
  private docs: Document[] = [];

  async init(documents: Document[], embeddings: number[][]): Promise<void> {
    this.docs = documents;
    this.db = new Database(":memory:");

    // Load sqlite-vec extension
    const extPath = getVecExtensionPath();
    this.db.loadExtension(extPath);

    // Create main documents table
    this.db.exec(`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        text TEXT
      )
    `);

    // Create FTS5 virtual table for full-text search with BM25
    this.db.exec(`
      CREATE VIRTUAL TABLE documents_fts USING fts5(
        id UNINDEXED,
        text,
        tokenize = 'porter unicode61'
      )
    `);

    // Create sqlite-vec virtual table for vector search
    this.db.exec(`
      CREATE VIRTUAL TABLE documents_vec USING vec0(
        id TEXT PRIMARY KEY,
        embedding float[${EMBEDDING_DIM}]
      )
    `);

    // Insert documents using transactions for speed
    const insertDoc = this.db.prepare(
      "INSERT INTO documents (id, text) VALUES (?, ?)"
    );
    const insertFts = this.db.prepare(
      "INSERT INTO documents_fts (id, text) VALUES (?, ?)"
    );
    const insertVec = this.db.prepare(
      "INSERT INTO documents_vec (id, embedding) VALUES (?, ?)"
    );

    const insertAll = this.db.transaction(() => {
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        insertDoc.run(doc.id, doc.text);
        insertFts.run(doc.id, doc.text);
        insertVec.run(doc.id, float32ArrayToBuffer(embeddings[i]));
      }
    });
    insertAll();
  }

  async searchVector(
    queryEmbedding: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const rows = this.db
      .prepare(
        `SELECT id, distance
         FROM documents_vec
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?`
      )
      .all(float32ArrayToBuffer(queryEmbedding), topK) as any[];

    return rows.map((r: any) => ({
      docId: r.id,
      score: 1 / (1 + r.distance),
    }));
  }

  async searchFTS(queryText: string, topK: number): Promise<SearchResult[]> {
    const ftsQuery = queryText
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 1)
      .join(" OR ");

    try {
      const rows = this.db
        .prepare(
          `SELECT id, rank AS score
           FROM documents_fts
           WHERE documents_fts MATCH ?
           ORDER BY rank
           LIMIT ?`
        )
        .all(ftsQuery, topK) as any[];

      return rows.map((r: any) => ({
        docId: r.id,
        score: -r.score,
      }));
    } catch {
      return [];
    }
  }

  async searchHybrid(
    queryText: string,
    queryEmbedding: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const vecResults = await this.searchVector(queryEmbedding, topK * 2);
    const ftsResults = await this.searchFTS(queryText, topK * 2);

    const k = 60;
    const scores = new Map<string, number>();

    vecResults.forEach((r, i) => {
      scores.set(r.docId, (scores.get(r.docId) ?? 0) + 1 / (k + i + 1));
    });

    ftsResults.forEach((r, i) => {
      scores.set(r.docId, (scores.get(r.docId) ?? 0) + 1 / (k + i + 1));
    });

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([docId, score]) => ({ docId, score }));
  }

  async cleanup(): Promise<void> {
    this.db?.close();
  }
}
