# vecdb-bench

A Bun + TypeScript benchmark evaluating three embedded vector database stacks for hybrid semantic search, targeting **code indexing/RAG** and **fantasy book RAG** use cases.

### Stacks Evaluated

| Stack | Components |
|-------|-----------|
| **LanceDB** | Native vector search + FTS + RRF hybrid fusion |
| **DuckDB + VSS + FTS** | `duckdb` with vector similarity search & full-text search extensions |
| **SQLite + FTS5 + sqlite-vec** | `bun:sqlite` with `sqlite-vec` for vectors + FTS5 for full-text |

### Environment Variables

Copy `.env.example` to `.env` and fill in your API keys and model configuration. See `.env.example` for all required variables.

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
cp .env.example .env  # add your API keys and model config
bun run src/bench.ts
```

#### Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--dimensions` | `-d` | `1024` | Embedding vector dimensions. Must be supported by your embedding model. |

Example with custom dimensions:

```bash
bun run src/bench.ts --dimensions 512
bun run src/bench.ts -d 256
```

### Results

#### Models Used

- **Embedding**: `Qwen/Qwen3-Embedding-0.6B` (1024 dimensions) via SiliconFlow API
- **Reranker**: `Qwen/Qwen3-Reranker-0.6B` via SiliconFlow API

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

---

### Results with 8B Models (4096 dimensions)

#### Models Used

- **Embedding**: `Qwen/Qwen3-Embedding-8B` (4096 dimensions) via Nebius API
- **Reranker**: `Qwen/Qwen3-Reranker-8B` via SiliconFlow API

#### Code Search Dataset (20 docs, 20 queries)

| Engine | Method | P@5 | R@5 | MRR | NDCG@5 | Avg ms | P95 ms | Index ms |
|--------|--------|-----|-----|-----|--------|--------|--------|----------|
| LanceDB | vector | 0.230 | 0.975 | 1.000 | 0.975 | 1.8 | 6.7 | 26 |
| LanceDB | fts | 0.220 | 0.925 | 0.925 | 0.912 | 1.2 | 2.1 | 26 |
| LanceDB | hybrid | 0.230 | 0.975 | 0.967 | 0.956 | 2.4 | 3.8 | 26 |
| LanceDB | hybrid+rerank | 0.240 | 1.000 | 1.000 | 1.000 | 3.0 | 4.3 | 26 |
| DuckDB + VSS + FTS | vector | 0.230 | 0.975 | 1.000 | 0.975 | 49.5 | 54.4 | 659 |
| DuckDB + VSS + FTS | fts | 0.220 | 0.925 | 0.925 | 0.912 | 12.5 | 24.9 | 659 |
| DuckDB + VSS + FTS | hybrid | 0.230 | 0.975 | 0.975 | 0.962 | 58.1 | 66.5 | 659 |
| DuckDB + VSS + FTS | hybrid+rerank | 0.240 | 1.000 | 1.000 | 1.000 | 69.7 | 77.4 | 659 |
| SQLite + FTS5 + sqlite-vec | vector | 0.230 | 0.975 | 1.000 | 0.975 | 1.5 | 6.4 | 10 |
| SQLite + FTS5 + sqlite-vec | fts | 0.220 | 0.925 | 0.925 | 0.912 | 0.1 | 0.5 | 10 |
| SQLite + FTS5 + sqlite-vec | hybrid | 0.230 | 0.975 | 0.975 | 0.962 | 1.3 | 1.7 | 10 |
| SQLite + FTS5 + sqlite-vec | hybrid+rerank | 0.240 | 1.000 | 1.000 | 1.000 | 5.3 | 8.2 | 10 |

#### Fantasy Books Dataset (20 docs, 20 queries)

| Engine | Method | P@5 | R@5 | MRR | NDCG@5 | Avg ms | P95 ms | Index ms |
|--------|--------|-----|-----|-----|--------|--------|--------|----------|
| LanceDB | vector | 0.240 | 1.000 | 1.000 | 0.996 | 1.5 | 5.4 | 16 |
| LanceDB | fts | 0.240 | 1.000 | 0.950 | 0.963 | 1.2 | 2.4 | 16 |
| LanceDB | hybrid | 0.240 | 1.000 | 0.975 | 0.982 | 2.3 | 3.0 | 16 |
| LanceDB | hybrid+rerank | 0.240 | 1.000 | 1.000 | 0.994 | 3.0 | 4.6 | 16 |
| DuckDB + VSS + FTS | vector | 0.240 | 1.000 | 1.000 | 0.996 | 47.9 | 62.5 | 656 |
| DuckDB + VSS + FTS | fts | 0.240 | 1.000 | 0.950 | 0.963 | 12.0 | 18.6 | 656 |
| DuckDB + VSS + FTS | hybrid | 0.240 | 1.000 | 1.000 | 0.996 | 57.3 | 64.4 | 656 |
| DuckDB + VSS + FTS | hybrid+rerank | 0.240 | 1.000 | 1.000 | 0.994 | 69.8 | 78.3 | 656 |
| SQLite + FTS5 + sqlite-vec | vector | 0.240 | 1.000 | 1.000 | 0.996 | 1.3 | 6.6 | 5 |
| SQLite + FTS5 + sqlite-vec | fts | 0.240 | 1.000 | 0.975 | 0.974 | 0.1 | 0.3 | 5 |
| SQLite + FTS5 + sqlite-vec | hybrid | 0.240 | 1.000 | 1.000 | 0.996 | 1.7 | 3.8 | 5 |
| SQLite + FTS5 + sqlite-vec | hybrid+rerank | 0.240 | 1.000 | 1.000 | 0.994 | 5.3 | 7.8 | 5 |

#### Aggregate Scores

| Engine | P@5 | R@5 | MRR | NDCG@5 | Avg Latency | Avg Indexing | Quality | Perf | Combined |
|--------|-----|-----|-----|--------|-------------|-------------|---------|------|----------|
| **SQLite + FTS5 + sqlite-vec** | 0.235 | 0.984 | 0.984 | 0.976 | 2.1ms | 8ms | 83.2% | 98.0% | **87.6%** |
| **LanceDB** | 0.235 | 0.984 | 0.977 | 0.972 | 2.0ms | 21ms | 82.9% | 98.0% | **87.4%** |
| **DuckDB + VSS + FTS** | 0.235 | 0.984 | 0.981 | 0.975 | 47.1ms | 658ms | 83.1% | 68.0% | **78.5%** |

#### 8B vs 0.6B Comparison

- **8B models improve hybrid+rerank quality** — Code Search achieves perfect 1.000 NDCG@5 across all engines (vs 0.981 with 0.6B)
- **Fantasy Books vector search improves** — 0.996 NDCG@5 with 8B vs 0.958 with 0.6B
- **DuckDB latency increases significantly** with 4096d vectors — ~50ms vector search vs ~12ms at 1024d
- **SQLite and LanceDB handle 4× larger vectors well** — latency increase is minimal (1–5ms range)
- **Overall ranking unchanged** — SQLite > LanceDB > DuckDB regardless of model size

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
