import { config } from "dotenv";
config({ path: ".env" });

// Use SiliconFlow for both embedding and reranking since Nebius key is invalid
// The .env model name "ada" is a placeholder — we use the actual available models
export const EMBEDDING_API_KEY =
  process.env.EMBEDDING_API_KEY_BASE_URL_API_KEY ??
  process.env.RERANKER_API_KEY!;
export const EMBEDDING_BASE_URL =
  process.env.EMBEDDING_API_KEY_BASE_URL ?? "https://api.siliconflow.com/v1";
export const EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B";
export const EMBEDDING_DIM = 1024;

export const RERANKER_API_KEY = process.env.RERANKER_API_KEY!;
export const RERANKER_BASE_URL =
  process.env.RERANKER_API_KEY_BASE_URL ?? "https://api.siliconflow.com/v1";
export const RERANKER_MODEL = "Qwen/Qwen3-Reranker-0.6B";

// Since Nebius auth fails, fall back to SiliconFlow key for embeddings too
export const EFFECTIVE_EMBEDDING_KEY = RERANKER_API_KEY;
export const EFFECTIVE_EMBEDDING_URL = "https://api.siliconflow.com/v1";
