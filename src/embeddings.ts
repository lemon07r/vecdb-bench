import {
  EFFECTIVE_EMBEDDING_KEY,
  EFFECTIVE_EMBEDDING_URL,
  EMBEDDING_MODEL,
  RERANKER_API_KEY,
  RERANKER_BASE_URL,
  RERANKER_MODEL,
} from "./config";

const BATCH_SIZE = 32;
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    let retries = 0;
    while (true) {
      try {
        const res = await fetch(`${EFFECTIVE_EMBEDDING_URL}/embeddings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${EFFECTIVE_EMBEDDING_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Embedding API ${res.status}: ${text}`);
        }
        const json = (await res.json()) as {
          data: { embedding: number[]; index: number }[];
        };
        // Sort by index to maintain order
        const sorted = json.data.sort((a, b) => a.index - b.index);
        results.push(...sorted.map((d) => d.embedding));
        break;
      } catch (e) {
        retries++;
        if (retries >= MAX_RETRIES) throw e;
        console.warn(`Embedding retry ${retries}/${MAX_RETRIES}...`);
        await sleep(RETRY_DELAY * retries);
      }
    }
    // Rate limiting
    if (i + BATCH_SIZE < texts.length) await sleep(100);
  }
  return results;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const [emb] = await getEmbeddings([text]);
  return emb;
}

export interface RerankResult {
  index: number;
  relevance_score: number;
}

export async function rerank(
  query: string,
  documents: string[],
  topK?: number
): Promise<RerankResult[]> {
  if (documents.length === 0) return [];
  let retries = 0;
  while (true) {
    try {
      const res = await fetch(`${RERANKER_BASE_URL}/rerank`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RERANKER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: RERANKER_MODEL,
          query,
          documents,
          top_n: topK ?? documents.length,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Rerank API ${res.status}: ${text}`);
      }
      const json = (await res.json()) as { results: RerankResult[] };
      return json.results.sort(
        (a, b) => b.relevance_score - a.relevance_score
      );
    } catch (e) {
      retries++;
      if (retries >= MAX_RETRIES) throw e;
      console.warn(`Rerank retry ${retries}/${MAX_RETRIES}...`);
      await sleep(RETRY_DELAY * retries);
    }
  }
}
