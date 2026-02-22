import { getCodeDataset, getFantasyDataset, type Dataset } from "./datasets";
import { getEmbeddings, getEmbedding, rerank } from "./embeddings";
import type { SearchEngine, SearchResult, BenchmarkResult } from "./types";
import { LanceDBEngine } from "./engines/lancedb-engine";
import { DuckDBEngine } from "./engines/duckdb-engine";
import { SQLiteEngine } from "./engines/sqlite-engine";

const TOP_K = 5;

// ── Metrics ──

function precisionAtK(retrieved: string[], relevant: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = topK.filter((id) => relevant.includes(id)).length;
  return hits / k;
}

function recallAtK(retrieved: string[], relevant: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  const hits = topK.filter((id) => relevant.includes(id)).length;
  return relevant.length === 0 ? 0 : hits / relevant.length;
}

function mrr(retrieved: string[], relevant: string[]): number {
  for (let i = 0; i < retrieved.length; i++) {
    if (relevant.includes(retrieved[i])) return 1 / (i + 1);
  }
  return 0;
}

function ndcgAtK(retrieved: string[], relevant: string[], k: number): number {
  const topK = retrieved.slice(0, k);
  let dcg = 0;
  for (let i = 0; i < topK.length; i++) {
    if (relevant.includes(topK[i])) {
      dcg += 1 / Math.log2(i + 2);
    }
  }
  // Ideal DCG
  let idcg = 0;
  for (let i = 0; i < Math.min(relevant.length, k); i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  return idcg === 0 ? 0 : dcg / idcg;
}

function p95(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? 0;
}

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Runner ──

async function runSearchMethod(
  engine: SearchEngine,
  dataset: Dataset,
  method: "vector" | "fts" | "hybrid" | "hybrid+rerank",
  queryEmbeddings: number[][],
  indexingTime: number
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  const precisions: number[] = [];
  const recalls: number[] = [];
  const mrrs: number[] = [];
  const ndcgs: number[] = [];

  for (let i = 0; i < dataset.queries.length; i++) {
    const q = dataset.queries[i];
    const qEmb = queryEmbeddings[i];
    let results: SearchResult[];
    const start = performance.now();

    switch (method) {
      case "vector":
        results = await engine.searchVector(qEmb, TOP_K);
        break;
      case "fts":
        results = await engine.searchFTS(q.text, TOP_K);
        break;
      case "hybrid":
        results = await engine.searchHybrid(q.text, qEmb, TOP_K);
        break;
      case "hybrid+rerank": {
        // Get more candidates from hybrid — only time the DB query
        results = await engine.searchHybrid(q.text, qEmb, TOP_K * 3);
        const dbElapsed = performance.now() - start;
        // Rerank via API (not timed — we're benchmarking DB, not API latency)
        const docTexts = results.map(
          (r) => dataset.documents.find((d) => d.id === r.docId)!.text
        );
        const reranked = await rerank(q.text, docTexts, TOP_K);
        results = reranked.map((rr) => ({
          docId: results[rr.index].docId,
          score: rr.relevance_score,
        }));
        latencies.push(dbElapsed);
        break;
      }
    }

    // For non-rerank methods, record elapsed time here
    if (method !== "hybrid+rerank") {
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
    }

    const retrieved = results.map((r) => r.docId);
    precisions.push(precisionAtK(retrieved, q.relevantDocIds, TOP_K));
    recalls.push(recallAtK(retrieved, q.relevantDocIds, TOP_K));
    mrrs.push(mrr(retrieved, q.relevantDocIds));
    ndcgs.push(ndcgAtK(retrieved, q.relevantDocIds, TOP_K));
  }

  return {
    engine: engine.name,
    dataset: dataset.name,
    method,
    metrics: {
      precision_at_5: avg(precisions),
      recall_at_5: avg(recalls),
      mrr: avg(mrrs),
      ndcg_at_5: avg(ndcgs),
      avg_latency_ms: avg(latencies),
      p95_latency_ms: p95(latencies),
      indexing_time_ms: indexingTime,
    },
  };
}

async function benchmarkEngine(
  engine: SearchEngine,
  dataset: Dataset,
  docEmbeddings: number[][],
  queryEmbeddings: number[][]
): Promise<BenchmarkResult[]> {
  console.log(`\n  ⏳ Indexing ${dataset.documents.length} docs into ${engine.name}...`);
  const t0 = performance.now();
  await engine.init(dataset.documents, docEmbeddings);
  const indexingTime = performance.now() - t0;
  console.log(`  ✅ Indexed in ${indexingTime.toFixed(0)}ms`);

  const results: BenchmarkResult[] = [];

  for (const method of ["vector", "fts", "hybrid", "hybrid+rerank"] as const) {
    console.log(`  🔍 Running ${method} search...`);
    const result = await runSearchMethod(
      engine,
      dataset,
      method,
      queryEmbeddings,
      indexingTime
    );
    results.push(result);
  }

  await engine.cleanup();
  return results;
}

// ── Main ──

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   Vector DB Benchmark — LanceDB vs DuckDB vs SQLite    ║");
  console.log("║   Hybrid Search Eval for Code & Fantasy RAG            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log();
  console.log("Models:");
  console.log(`  Embedding: ${(await import("./config")).EMBEDDING_MODEL} (${(await import("./config")).EMBEDDING_DIM}d) via ${(await import("./config")).EMBEDDING_BASE_URL}`);
  console.log(`  Reranker:  ${(await import("./config")).RERANKER_MODEL} via ${(await import("./config")).RERANKER_BASE_URL}`);
  console.log();

  const datasets = [getCodeDataset(), getFantasyDataset()];
  const allResults: BenchmarkResult[] = [];

  for (const dataset of datasets) {
    console.log(`\n${"═".repeat(58)}`);
    console.log(`📚 Dataset: ${dataset.name} (${dataset.documents.length} docs, ${dataset.queries.length} queries)`);
    console.log("═".repeat(58));

    // Embed all documents
    console.log("  📐 Generating document embeddings...");
    const docTexts = dataset.documents.map((d) => d.text);
    const docEmbeddings = await getEmbeddings(docTexts);
    console.log(`  ✅ ${docEmbeddings.length} document embeddings generated`);

    // Embed all queries
    console.log("  📐 Generating query embeddings...");
    const queryTexts = dataset.queries.map((q) => q.text);
    const queryEmbeddings = await getEmbeddings(queryTexts);
    console.log(`  ✅ ${queryEmbeddings.length} query embeddings generated`);

    const engines: SearchEngine[] = [
      new LanceDBEngine(),
      new DuckDBEngine(),
      new SQLiteEngine(),
    ];

    for (const engine of engines) {
      try {
        const results = await benchmarkEngine(
          engine,
          dataset,
          docEmbeddings,
          queryEmbeddings
        );
        allResults.push(...results);
      } catch (e) {
        console.error(`  ❌ ${engine.name} failed:`, e);
      }
    }
  }

  // ── Print Results ──
  printResults(allResults);
  printFinalVerdict(allResults);
}

function printResults(results: BenchmarkResult[]) {
  console.log("\n\n");
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                    DETAILED RESULTS                                                ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝");

  const datasets = [...new Set(results.map((r) => r.dataset))];

  for (const ds of datasets) {
    console.log(`\n┌─── ${ds} ${"─".repeat(Math.max(0, 90 - ds.length))}┐`);
    console.log(
      `│ ${"Engine".padEnd(28)} │ ${"Method".padEnd(15)} │ ${"P@5".padEnd(6)} │ ${"R@5".padEnd(6)} │ ${"MRR".padEnd(6)} │ ${"NDCG@5".padEnd(6)} │ ${"Avg ms".padEnd(8)} │ ${"P95 ms".padEnd(8)} │ ${"Index ms".padEnd(8)} │`
    );
    console.log(`│${"─".repeat(97)}│`);

    const dsResults = results.filter((r) => r.dataset === ds);
    for (const r of dsResults) {
      const m = r.metrics;
      console.log(
        `│ ${r.engine.padEnd(28)} │ ${r.method.padEnd(15)} │ ${m.precision_at_5.toFixed(3).padStart(5)} │ ${m.recall_at_5.toFixed(3).padStart(5)} │ ${m.mrr.toFixed(3).padStart(5)} │ ${m.ndcg_at_5.toFixed(3).padStart(5)}  │ ${m.avg_latency_ms.toFixed(1).padStart(7)} │ ${m.p95_latency_ms.toFixed(1).padStart(7)} │ ${m.indexing_time_ms.toFixed(0).padStart(7)} │`
      );
    }
    console.log(`└${"─".repeat(97)}┘`);
  }
}

function printFinalVerdict(results: BenchmarkResult[]) {
  console.log("\n\n");
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║                                    AGGREGATE SCORES                                                ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝");

  const engines = [...new Set(results.map((r) => r.engine))];

  // Compute aggregate per engine across all datasets and methods
  for (const engine of engines) {
    const engineResults = results.filter((r) => r.engine === engine);
    const avgP = avg(engineResults.map((r) => r.metrics.precision_at_5));
    const avgR = avg(engineResults.map((r) => r.metrics.recall_at_5));
    const avgMRR = avg(engineResults.map((r) => r.metrics.mrr));
    const avgNDCG = avg(engineResults.map((r) => r.metrics.ndcg_at_5));
    const avgLat = avg(engineResults.map((r) => r.metrics.avg_latency_ms));
    const avgIdx = avg(engineResults.map((r) => r.metrics.indexing_time_ms));

    // Quality score (weighted: MRR 30%, NDCG 30%, Recall 20%, Precision 20%)
    const qualityScore = avgMRR * 0.3 + avgNDCG * 0.3 + avgR * 0.2 + avgP * 0.2;
    // Performance score (inverse of latency, normalized)
    const perfScore = 1 / (1 + avgLat / 100);

    // Combined score (70% quality, 30% performance)
    const combined = qualityScore * 0.7 + perfScore * 0.3;

    console.log(`\n  🏷️  ${engine}`);
    console.log(`     Quality:     P@5=${avgP.toFixed(3)}  R@5=${avgR.toFixed(3)}  MRR=${avgMRR.toFixed(3)}  NDCG@5=${avgNDCG.toFixed(3)}`);
    console.log(`     Performance: Avg Latency=${avgLat.toFixed(1)}ms  Avg Indexing=${avgIdx.toFixed(0)}ms`);
    console.log(`     ────────────────────────────────────────`);
    console.log(`     Quality Score:     ${(qualityScore * 100).toFixed(1)}%`);
    console.log(`     Performance Score: ${(perfScore * 100).toFixed(1)}%`);
    console.log(`     Combined Score:    ${(combined * 100).toFixed(1)}% (70% quality + 30% perf)`);
  }

  // Best hybrid+rerank per dataset
  console.log("\n\n  🏆 BEST hybrid+rerank per dataset:");
  const datasets = [...new Set(results.map((r) => r.dataset))];
  for (const ds of datasets) {
    const hrResults = results.filter(
      (r) => r.dataset === ds && r.method === "hybrid+rerank"
    );
    if (hrResults.length === 0) continue;
    hrResults.sort((a, b) => b.metrics.ndcg_at_5 - a.metrics.ndcg_at_5);
    const best = hrResults[0];
    console.log(
      `     ${ds}: ${best.engine} (NDCG@5=${best.metrics.ndcg_at_5.toFixed(3)}, MRR=${best.metrics.mrr.toFixed(3)}, ${best.metrics.avg_latency_ms.toFixed(0)}ms)`
    );
  }

  // Overall winner
  const engineScores = engines.map((engine) => {
    const er = results.filter((r) => r.engine === engine);
    const q =
      avg(er.map((r) => r.metrics.mrr)) * 0.3 +
      avg(er.map((r) => r.metrics.ndcg_at_5)) * 0.3 +
      avg(er.map((r) => r.metrics.recall_at_5)) * 0.2 +
      avg(er.map((r) => r.metrics.precision_at_5)) * 0.2;
    const p = 1 / (1 + avg(er.map((r) => r.metrics.avg_latency_ms)) / 100);
    return { engine, score: q * 0.7 + p * 0.3 };
  });
  engineScores.sort((a, b) => b.score - a.score);

  console.log("\n\n  🥇 FINAL RANKING:");
  engineScores.forEach((e, i) => {
    const medal = ["🥇", "🥈", "🥉"][i] ?? "  ";
    console.log(`     ${medal} ${e.engine}: ${(e.score * 100).toFixed(1)}%`);
  });
  console.log();
}

main().catch(console.error);
