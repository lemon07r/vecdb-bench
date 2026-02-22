import * as lancedb from "@lancedb/lancedb";
import type { Document } from "../datasets";
import type { SearchEngine, SearchResult } from "../types";
import { EMBEDDING_DIM } from "../config";

export class LanceDBEngine implements SearchEngine {
  name = "LanceDB";
  private db!: lancedb.Connection;
  private table!: lancedb.Table;
  private docs: Document[] = [];

  async init(documents: Document[], embeddings: number[][]): Promise<void> {
    this.docs = documents;
    this.db = await lancedb.connect("data/lancedb");

    const data = documents.map((doc, i) => ({
      id: doc.id,
      text: doc.text,
      vector: embeddings[i],
    }));

    // Drop existing table if present
    try {
      await this.db.dropTable("documents");
    } catch {}

    this.table = await this.db.createTable("documents", data);

    // Create FTS index on text field
    await this.table.createIndex("text", {
      config: lancedb.Index.fts(),
    });

    // Create vector index — use IVF_PQ only if enough rows, otherwise IVF_FLAT
    if (documents.length >= 256) {
      await this.table.createIndex("vector", {
        config: lancedb.Index.ivfPq({
          numPartitions: Math.min(4, documents.length),
          numSubVectors: 16,
        }),
      });
    }
  }

  async searchVector(
    queryEmbedding: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const results = await this.table
      .search(queryEmbedding)
      .limit(topK)
      .toArray();

    return results.map((r: any) => ({
      docId: r.id,
      score: 1 / (1 + (r._distance ?? 0)),
    }));
  }

  async searchFTS(queryText: string, topK: number): Promise<SearchResult[]> {
    try {
      const results = await this.table
        .query()
        .fullTextSearch(queryText, { columns: ["text"] })
        .limit(topK)
        .toArray();

      return results.map((r: any, i: number) => ({
        docId: r.id,
        score: r._score ?? 1 / (i + 1),
      }));
    } catch {
      // Fallback: if FTS API differs, return empty
      return [];
    }
  }

  async searchHybrid(
    queryText: string,
    queryEmbedding: number[],
    topK: number
  ): Promise<SearchResult[]> {
    // Get FTS results
    let ftsResults: any[] = [];
    try {
      ftsResults = await this.table
        .query()
        .fullTextSearch(queryText, { columns: ["text"] })
        .limit(topK * 2)
        .toArray();
    } catch {}

    const vecResults = await this.table
      .search(queryEmbedding)
      .limit(topK * 2)
      .toArray();

    // Reciprocal Rank Fusion (RRF) with k=60
    const k = 60;
    const scores = new Map<string, number>();

    ftsResults.forEach((r: any, i: number) => {
      const id = r.id;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1));
    });

    vecResults.forEach((r: any, i: number) => {
      const id = r.id;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1));
    });

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([docId, score]) => ({ docId, score }));
  }

  async cleanup(): Promise<void> {
    try {
      await this.db.dropTable("documents");
    } catch {}
  }
}
