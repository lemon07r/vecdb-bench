import type { Document, Query } from "./datasets";

export interface SearchResult {
  docId: string;
  score: number;
}

export interface SearchEngine {
  name: string;
  init(documents: Document[], embeddings: number[][]): Promise<void>;
  searchVector(queryEmbedding: number[], topK: number): Promise<SearchResult[]>;
  searchFTS(queryText: string, topK: number): Promise<SearchResult[]>;
  searchHybrid(
    queryText: string,
    queryEmbedding: number[],
    topK: number
  ): Promise<SearchResult[]>;
  cleanup(): Promise<void>;
}

export interface BenchmarkResult {
  engine: string;
  dataset: string;
  method: "vector" | "fts" | "hybrid" | "hybrid+rerank";
  metrics: {
    precision_at_5: number;
    recall_at_5: number;
    mrr: number;
    ndcg_at_5: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    indexing_time_ms: number;
  };
}
