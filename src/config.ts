import { config } from "dotenv";
config({ path: ".env" });

export const EMBEDDING_API_KEY = process.env.EMBEDDING_MODEL_API_KEY!;
export const EMBEDDING_BASE_URL = process.env.EMBEDDING_MODEL_BASE_URL!;
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL_ID!;
export const EMBEDDING_DIM = 1024;

export const RERANKER_API_KEY = process.env.RERANKER_MODEL_API_KEY!;
export const RERANKER_BASE_URL = process.env.RERANKER_MODEL_BASE_URL!;
export const RERANKER_MODEL = process.env.RERANKER_MODEL_ID!;

export const EFFECTIVE_EMBEDDING_KEY = EMBEDDING_API_KEY;
export const EFFECTIVE_EMBEDDING_URL = EMBEDDING_BASE_URL;
