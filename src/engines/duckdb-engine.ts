import duckdb from "duckdb";
import type { Document } from "../datasets";
import type { SearchEngine, SearchResult } from "../types";
import { EMBEDDING_DIM } from "../config";

function query(db: duckdb.Database, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, ...params, (err: Error | null, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows ?? []);
    });
  });
}

function run(db: duckdb.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export class DuckDBEngine implements SearchEngine {
  name = "DuckDB + VSS + FTS";
  private db!: duckdb.Database;
  private docs: Document[] = [];

  async init(documents: Document[], embeddings: number[][]): Promise<void> {
    this.docs = documents;
    this.db = new duckdb.Database(":memory:");

    // Install and load extensions
    await run(this.db, "INSTALL vss");
    await run(this.db, "LOAD vss");
    await run(this.db, "INSTALL fts");
    await run(this.db, "LOAD fts");

    // Set HNSW parameters for optimal search
    await run(this.db, "SET hnsw_enable_experimental_persistence = true");

    // Create documents table
    await run(
      this.db,
      `CREATE TABLE documents (
        id VARCHAR PRIMARY KEY,
        text VARCHAR,
        embedding FLOAT[${EMBEDDING_DIM}]
      )`
    );

    // Insert documents
    const stmt = `INSERT INTO documents VALUES (?, ?, ?)`;
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const embStr = `[${embeddings[i].join(",")}]`;
      await run(this.db, `INSERT INTO documents VALUES ('${doc.id.replace(/'/g, "''")}', '${doc.text.replace(/'/g, "''")}', ${embStr}::FLOAT[${EMBEDDING_DIM}])`);
    }

    // Create HNSW index for vector search
    await run(
      this.db,
      `CREATE INDEX vec_idx ON documents USING HNSW (embedding) WITH (metric = 'cosine')`
    );

    // Create FTS index using pragma
    await run(
      this.db,
      `PRAGMA create_fts_index('documents', 'id', 'text', stemmer = 'english', stopwords = 'english', lower = 1)`
    );
  }

  async searchVector(
    queryEmbedding: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const embStr = `[${queryEmbedding.join(",")}]`;
    const rows = await query(
      this.db,
      `SELECT id, array_cosine_distance(embedding, ${embStr}::FLOAT[${EMBEDDING_DIM}]) as distance
       FROM documents
       ORDER BY distance ASC
       LIMIT ${topK}`
    );

    return rows.map((r: any) => ({
      docId: r.id,
      score: 1 - (r.distance ?? 0),
    }));
  }

  async searchFTS(queryText: string, topK: number): Promise<SearchResult[]> {
    const escaped = queryText.replace(/'/g, "''");
    const rows = await query(
      this.db,
      `SELECT id, text, fts_main_documents.match_bm25(id, '${escaped}', fields := 'text') AS score
       FROM documents
       WHERE score IS NOT NULL
       ORDER BY score DESC
       LIMIT ${topK}`
    );

    return rows.map((r: any) => ({
      docId: r.id,
      score: r.score ?? 0,
    }));
  }

  async searchHybrid(
    queryText: string,
    queryEmbedding: number[],
    topK: number
  ): Promise<SearchResult[]> {
    // Get both result sets
    const vecResults = await this.searchVector(queryEmbedding, topK * 2);
    const ftsResults = await this.searchFTS(queryText, topK * 2);

    // RRF fusion
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
