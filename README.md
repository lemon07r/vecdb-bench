# vecdb-bench

A Bun + TypeScript benchmark evaluating three embedded vector database stacks for hybrid semantic search, targeting **code indexing/RAG** and **fantasy book RAG** use cases.

### Stacks Evaluated

| Stack | Components |
|-------|-----------|
| **LanceDB** | Native vector search + FTS + RRF hybrid fusion |
| **DuckDB + VSS + FTS** | `duckdb` with vector similarity search & full-text search extensions |
| **SQLite + FTS5 + sqlite-vec** | `bun:sqlite` with `sqlite-vec` for vectors + FTS5 for full-text |

### Models

- **Embedding**: Qwen3-Embedding-0.6B (1024 dimensions) via SiliconFlow API
- **Reranker**: Qwen3-Reranker-0.6B via SiliconFlow API

### Methodology

- **Datasets**: 20 code snippets + 20 fantasy book passages, each with 20 queries and ground-truth relevance labels
- **Search methods**: vector-only, FTS-only, hybrid (RRF fusion), hybrid + reranker
- **Metrics**: Precision@5, Recall@5, MRR, NDCG@5, average latency, P95 latency, indexing time
- **Latency measurement**: Only DB query time is measured — embedding and reranker API latency is **excluded** so results reflect pure database performance
- **Scoring**: Combined score = 70% quality (weighted MRR/NDCG/Recall/Precision) + 30% performance (inverse latency)

### Setup

```bash
git clone https://github.com/lemon07r/vecdb-bench.git
bun install
cp .env.example .env  # add your API keys
bun run src/bench.ts
```

### Results

#### Code Search Dataset (20 docs, 20 queries)

| Engine | Method | P@5 | R@5 | MRR | NDCG@5 | Avg ms | P95 ms | Index ms |
|--------|--------|-----|-----|-----|--------|--------|--------|----------|
| LanceDB | vector | 0.230 | 0.975 | 1.000 | 0.981 | 1.7 | 6.3 | 24 |
| LanceDB | fts | 0.220 | 0.925 | 0.925 | 0.912 | 1.2 | 2.3 | 24 |
| LanceDB | hybrid | 0.230 | 0.975 | 0.950 | 0.944 | 2.2 | 3.3 | 24 |
| LanceDB | hybrid+rerank | 0.230 | 0.975 | 1.000 | 0.981 | 2.9 | 3.2 | 24 |
| DuckDB + VSS + FTS | vector | 0.230 | 0.975 | 1.000 | 0.981 | 12.3 | 15.1 | 230 |
| DuckDB + VSS + FTS | fts | 0.220 | 0.925 | 0.925 | 0.912 | 11.2 | 18.8 | 230 |
| DuckDB + VSS + FTS | hybrid | 0.230 | 0.975 | 0.967 | 0.956 | 23.5 | 26.2 | 230 |
| DuckDB + VSS + FTS | hybrid+rerank | 0.230 | 0.975 | 1.000 | 0.981 | 27.5 | 32.2 | 230 |
| SQLite + FTS5 + sqlite-vec | vector | 0.230 | 0.975 | 1.000 | 0.981 | 0.3 | 2.1 | 5 |
| SQLite + FTS5 + sqlite-vec | fts | 0.220 | 0.925 | 0.925 | 0.912 | 0.1 | 0.5 | 5 |
| SQLite + FTS5 + sqlite-vec | hybrid | 0.230 | 0.975 | 0.967 | 0.956 | 0.5 | 2.2 | 5 |
| SQLite + FTS5 + sqlite-vec | hybrid+rerank | 0.230 | 0.975 | 1.000 | 0.981 | 0.9 | 2.3 | 5 |

#### Fantasy Books Dataset (20 docs, 20 queries)

| Engine | Method | P@5 | R@5 | MRR | NDCG@5 | Avg ms | P95 ms | Index ms |
|--------|--------|-----|-----|-----|--------|--------|--------|----------|
| LanceDB | vector | 0.230 | 0.975 | 0.975 | 0.958 | 1.2 | 2.0 | 11 |
| LanceDB | fts | 0.240 | 1.000 | 0.950 | 0.963 | 1.1 | 1.7 | 11 |
| LanceDB | hybrid | 0.240 | 1.000 | 1.000 | 1.000 | 2.0 | 2.9 | 11 |
| LanceDB | hybrid+rerank | 0.240 | 1.000 | 1.000 | 0.996 | 2.9 | 4.6 | 11 |
| DuckDB + VSS + FTS | vector | 0.230 | 0.975 | 0.975 | 0.958 | 12.2 | 13.8 | 211 |
| DuckDB + VSS + FTS | fts | 0.240 | 1.000 | 0.950 | 0.963 | 12.4 | 28.2 | 211 |
| DuckDB + VSS + FTS | hybrid | 0.240 | 1.000 | 0.975 | 0.982 | 24.4 | 29.0 | 211 |
| DuckDB + VSS + FTS | hybrid+rerank | 0.240 | 1.000 | 1.000 | 0.996 | 28.2 | 31.6 | 211 |
| SQLite + FTS5 + sqlite-vec | vector | 0.230 | 0.975 | 0.975 | 0.958 | 0.3 | 1.9 | 4 |
| SQLite + FTS5 + sqlite-vec | fts | 0.240 | 1.000 | 0.975 | 0.974 | 0.1 | 0.2 | 4 |
| SQLite + FTS5 + sqlite-vec | hybrid | 0.240 | 1.000 | 0.975 | 0.982 | 0.5 | 2.2 | 4 |
| SQLite + FTS5 + sqlite-vec | hybrid+rerank | 0.240 | 1.000 | 1.000 | 0.996 | 1.0 | 2.6 | 4 |

#### Aggregate Scores

| Engine | P@5 | R@5 | MRR | NDCG@5 | Avg Latency | Avg Indexing | Quality | Perf | Combined |
|--------|-----|-----|-----|--------|-------------|-------------|---------|------|----------|
| **SQLite + FTS5 + sqlite-vec** | 0.233 | 0.978 | 0.977 | 0.967 | 0.5ms | 5ms | 82.5% | 99.5% | **87.6%** |
| **LanceDB** | 0.233 | 0.978 | 0.975 | 0.967 | 1.9ms | 17ms | 82.5% | 98.1% | **87.2%** |
| **DuckDB + VSS + FTS** | 0.233 | 0.978 | 0.974 | 0.966 | 19.0ms | 221ms | 82.4% | 84.1% | **82.9%** |

### Key Takeaways

- **Quality is virtually identical** across all three engines (~0.97 MRR, ~0.97 NDCG@5 on hybrid+rerank). The reranker equalizes any quality differences.
- **SQLite is the fastest** — 0.1–1.0ms per query, 4–5ms indexing. ~40× faster than DuckDB, ~4× faster than LanceDB.
- **LanceDB has the best hybrid search quality** on Fantasy Books — perfect 1.000 NDCG@5 on hybrid without reranker.
- **DuckDB is slowest** at 12–28ms per query and 211–230ms indexing, but still fast in absolute terms.

### Recommendations

| Use Case | Recommendation |
|----------|---------------|
| **Maximum raw speed** | SQLite + FTS5 + sqlite-vec |
| **Best developer ergonomics** | LanceDB (simplest API, built-in hybrid) |
| **Analytics + search combo** | DuckDB + VSS + FTS |
| **Production RAG pipeline** | Any — quality is identical with reranker; pick based on ecosystem fit |
