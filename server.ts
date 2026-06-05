import express from "express";
import path from "path";
import fs from "node:fs";
import dotenv from "dotenv";
import { createHash, randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "";
const PAPER_CACHE_TTL_MS = 30 * 60 * 1000;
const SINGLE_PASS_CHAR_LIMIT = 40000;
const STRONG_CHUNK_CHAR_LIMIT = 120000;
const CHUNK_SIZE_CHARS = 28000;

// --- RAG constants ---
const RAG_CHUNK_SIZE = 1000;
const RAG_CHUNK_OVERLAP = 200;
const EMBEDDING_MODEL = "nomic-embed-text";
const EMBEDDING_CACHE_DIR = path.join(process.cwd(), ".cache", "embeddings");
fs.mkdirSync(EMBEDDING_CACHE_DIR, { recursive: true });

app.use(express.json({ limit: "50mb" }));

// --- Analysis result cache (disk-persisted) ---

const CACHE_DIR = path.join(process.cwd(), ".cache", "analyses");
fs.mkdirSync(CACHE_DIR, { recursive: true });

interface CachedAnalysis {
  id: string;
  paperTitle: string;
  model: string;
  analysisMode: "single" | "chunked";
  characters: number;
  createdAt: number;
  result: unknown;
  paperText?: string;
}

interface CachedAnalysisMeta {
  id: string;
  paperTitle: string;
  model: string;
  analysisMode: "single" | "chunked";
  characters: number;
  createdAt: number;
}

function cacheKey(paperText: string, model: string): string {
  return createHash("sha256").update(paperText).update(model).digest("hex");
}

function getCachedAnalysis(key: string): CachedAnalysis | null {
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function setCachedAnalysis(key: string, entry: CachedAnalysis): void {
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(entry), "utf-8");
}

function deleteCachedAnalysis(key: string): boolean {
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function listCachedAnalyses(): CachedAnalysisMeta[] {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
    const items: CachedAnalysisMeta[] = [];
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), "utf-8")) as CachedAnalysis;
        items.push({
          id: data.id,
          paperTitle: data.paperTitle,
          model: data.model,
          analysisMode: data.analysisMode,
          characters: data.characters,
          createdAt: data.createdAt,
        });
      } catch {
        // skip corrupted files
      }
    }
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

// --- Parsed paper in-memory cache ---

interface ParsedPaper {
  text: string;
  sourceLabel?: string;
  createdAt: number;
}

const parsedPapers = new Map<string, ParsedPaper>();

// --- RAG: Chunking, Embedding, Retrieval ---

interface EmbeddingCache {
  chunks: string[];
  embeddings: number[][];
  model: string;
  createdAt: number;
}

function chunkTextForRAG(text: string): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > RAG_CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      const overlapStart = Math.max(0, current.length - RAG_CHUNK_OVERLAP);
      current = current.slice(overlapStart) + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  if (chunks.length === 0 && text.trim()) {
    for (let i = 0; i < text.length; i += RAG_CHUNK_SIZE - RAG_CHUNK_OVERLAP) {
      chunks.push(text.slice(i, i + RAG_CHUNK_SIZE));
    }
  }

  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getEmbeddingCacheKey(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function getCachedEmbeddings(key: string): EmbeddingCache | null {
  const filePath = path.join(EMBEDDING_CACHE_DIR, `${key}.json`);
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function setCachedEmbeddings(key: string, cache: EmbeddingCache): void {
  const filePath = path.join(EMBEDDING_CACHE_DIR, `${key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(cache), "utf-8");
}

const readyEmbeddingModels = new Set<string>();

async function ensureEmbeddingModel(model: string): Promise<void> {
  if (readyEmbeddingModels.has(model)) return;

  const tagsRes = await fetch(`${OLLAMA_URL}/api/tags`);
  if (!tagsRes.ok) {
    throw new Error("Cannot connect to Ollama. Is it running?");
  }
  const tags = await tagsRes.json();
  const installed = (tags.models || []).some(
    (m: any) => m.name === model || m.name.startsWith(model + ":")
  );

  if (!installed) {
    console.log(`Pulling embedding model: ${model}...`);
    const pullRes = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });

    if (!pullRes.ok) {
      throw new Error(`Failed to pull embedding model "${model}". Run: ollama pull ${model}`);
    }

    const reader = pullRes.body?.getReader();
    if (reader) {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }
    console.log(`Embedding model ${model} pulled successfully.`);
  }

  readyEmbeddingModels.add(model);
}

async function embedTexts(texts: string[], model: string): Promise<number[][]> {
  await ensureEmbeddingModel(model);

  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Embedding request failed: ${response.status} ${response.statusText}. ${errText}`);
  }

  const data = await response.json();
  return data.embeddings;
}

async function embedPaper(paperId: string, embeddingModel: string): Promise<EmbeddingCache> {
  const paper = parsedPapers.get(paperId);
  if (!paper) {
    throw new Error("Paper not found. Please re-upload.");
  }

  const cacheKeyVal = getEmbeddingCacheKey(paper.text + embeddingModel);
  const cached = getCachedEmbeddings(cacheKeyVal);
  if (cached) return cached;

  const chunks = chunkTextForRAG(paper.text);
  const batchSize = 10;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchEmbeddings = await embedTexts(batch, embeddingModel);
    allEmbeddings.push(...batchEmbeddings);
  }

  const result: EmbeddingCache = {
    chunks,
    embeddings: allEmbeddings,
    model: embeddingModel,
    createdAt: Date.now(),
  };

  setCachedEmbeddings(cacheKeyVal, result);
  return result;
}

function retrieveTopChunks(
  questionEmbedding: number[],
  embeddingCache: EmbeddingCache,
  topK = 5,
): { chunkIndex: number; text: string; score: number }[] {
  const scored = embeddingCache.embeddings.map((emb, idx) => ({
    chunkIndex: idx,
    text: embeddingCache.chunks[idx],
    score: cosineSimilarity(questionEmbedding, emb),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function buildChatPrompt(
  question: string,
  retrievedChunks: { chunkIndex: number; text: string; score: number }[],
  history: { role: string; content: string }[],
): string {
  const contextBlock = retrievedChunks
    .map((c, i) => `[Chunk ${c.chunkIndex + 1}]\n${c.text}`)
    .join("\n\n---\n\n");

  const historyBlock = history.length > 0
    ? history
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n")
    : "";

  return `You are a helpful research assistant answering questions about a specific paper. Use ONLY the provided paper excerpts to answer. If the answer is not in the excerpts, say so clearly.

## Paper Excerpts
${contextBlock}

${historyBlock ? `## Conversation History\n${historyBlock}\n` : ""}
## Question
${question}

Answer concisely and accurately based on the paper excerpts above. Reference specific chunks when possible.`;
}

// --- End RAG infrastructure ---

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function cleanupParsedPapers() {
  const now = Date.now();

  for (const [paperId, paper] of parsedPapers.entries()) {
    if (now - paper.createdAt > PAPER_CACHE_TTL_MS) {
      parsedPapers.delete(paperId);
    }
  }
}

async function parsePdfBuffer(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

async function parsePdfText(pdfBase64: string) {
  return parsePdfBuffer(Buffer.from(pdfBase64, "base64"));
}

function normalizePdfUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS PDF links are supported.");
  }

  if (["arxiv.org", "www.arxiv.org"].includes(url.hostname) && url.pathname.startsWith("/abs/")) {
    const paperId = url.pathname.slice("/abs/".length);
    if (paperId) {
      url.hostname = "arxiv.org";
      url.pathname = `/pdf/${paperId}`;
      url.search = "";
      url.hash = "";
    }
  }

  return url.toString();
}

function isPdfBuffer(buffer: Buffer) {
  return buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"));
}

async function fetchPdfText(pdfUrl: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const normalizedUrl = normalizePdfUrl(pdfUrl);
    const response = await fetch(normalizedUrl, {
      headers: { "User-Agent": "paper-dreamer/1.0" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF link: ${response.status} ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 50 * 1024 * 1024) {
      throw new Error("PDF link is too large. Please use a file smaller than 50MB.");
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    if (!isPdfBuffer(pdfBuffer)) {
      const contentType = response.headers.get("content-type") || "unknown content type";
      throw new Error(`The link did not return a PDF (${contentType}). Use a direct PDF link, such as ${normalizedUrl.includes("arxiv.org/pdf/") ? normalizedUrl : "an arXiv /pdf/ URL"}.`);
    }

    return parsePdfBuffer(pdfBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildPrompt(paperText: string) {
  return `
You are an advanced academic research assistant.
Analyze the provided paper content, and return only valid JSON with this exact shape:
{
  "paper_title": "string",
  "summary": {
    "abstract": "string",
    "methodology": "string",
    "contributions": ["string"],
    "limitations": ["string"]
  },
  "layman_explanation": "string",
  "key_concepts": [
    { "term": "string", "definition": "string" }
  ],
  "evidence_backed_findings": [
    { "claim": "string", "source_excerpt": "string" }
  ],
  "related_work": ["string"],
  "research_questions": ["string"],
  "datasets_used": [
    { "name": "string", "description": "string" }
  ],
  "future_work": ["string"],
  "practical_applications": ["string"],
  "comparison_with_prior_work": [
    { "baseline": "string", "result": "string" }
  ]
}

Rules:
- Include 5-8 key concepts.
- Include 4-6 evidence-backed findings.
- Extract paper_title from the paper text. If the title is unclear, use "Untitled Paper".
- Every source_excerpt must be a concise verbatim quote from the paper text.
- For each optional section (related_work, research_questions, datasets_used, future_work, practical_applications, comparison_with_prior_work): include relevant items if found in the paper. Use an empty array [] if the paper does not contain information for that section.
- Do not include markdown, prose, or code fences.

Paper Content:
"""
${paperText.slice(0, SINGLE_PASS_CHAR_LIMIT)}
"""
`;
}

function buildChunkPrompt(chunkText: string, chunkNumber: number, totalChunks: number) {
  return `
You are analyzing one section of a research paper.
Return only valid JSON with this exact shape:
{
  "paper_title_candidate": "string",
  "chunk_summary": "string",
  "methods": ["string"],
  "claims": [
    { "claim": "string", "source_excerpt": "string" }
  ],
  "limitations": ["string"],
  "key_concepts": [
    { "term": "string", "definition": "string" }
  ],
  "related_work": ["string"],
  "research_questions": ["string"],
  "datasets_used": [
    { "name": "string", "description": "string" }
  ],
  "future_work": ["string"],
  "practical_applications": ["string"],
  "comparisons": [
    { "baseline": "string", "result": "string" }
  ]
}

Rules:
- This is chunk ${chunkNumber} of ${totalChunks}.
- If this chunk contains the paper title, include it in paper_title_candidate. Otherwise use an empty string.
- Every source_excerpt must be a concise verbatim quote from this chunk.
- For optional sections (related_work, research_questions, datasets_used, future_work, practical_applications, comparisons): include items found in this chunk. Use an empty array [] if not present.
- Do not include markdown, prose, or code fences.

Chunk Content:
"""
${chunkText}
"""
`;
}

function buildSynthesisPrompt(chunkAnalyses: unknown[]) {
  return `
You are combining multiple chunk-level analyses into one final research paper summary.
Return only valid JSON with this exact shape:
{
  "paper_title": "string",
  "summary": {
    "abstract": "string",
    "methodology": "string",
    "contributions": ["string"],
    "limitations": ["string"]
  },
  "layman_explanation": "string",
  "key_concepts": [
    { "term": "string", "definition": "string" }
  ],
  "evidence_backed_findings": [
    { "claim": "string", "source_excerpt": "string" }
  ],
  "related_work": ["string"],
  "research_questions": ["string"],
  "datasets_used": [
    { "name": "string", "description": "string" }
  ],
  "future_work": ["string"],
  "practical_applications": ["string"],
  "comparison_with_prior_work": [
    { "baseline": "string", "result": "string" }
  ]
}

Rules:
- Include 5-8 key concepts.
- Include 4-6 evidence-backed findings.
- Extract paper_title from the chunk analyses. If the title is unclear, use "Untitled Paper".
- Use only source excerpts already present in the chunk analyses.
- For optional sections (related_work, research_questions, datasets_used, future_work, practical_applications, comparison_with_prior_work): combine items found across chunks. Use an empty array [] if no information was found.
- Do not include markdown, prose, or code fences.

Chunk Analyses:
${JSON.stringify(chunkAnalyses)}
`;
}

function validateAnalysisResult(result: unknown): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!result || typeof result !== "object") return { valid: false, missing: ["entire response"] };

  const r = result as Record<string, unknown>;
  if (!r.paper_title) missing.push("paper_title");
  if (!r.summary || typeof r.summary !== "object") {
    missing.push("summary");
  } else {
    const s = r.summary as Record<string, unknown>;
    if (!s.abstract) missing.push("summary.abstract");
    if (!s.methodology) missing.push("summary.methodology");
    if (!Array.isArray(s.contributions)) missing.push("summary.contributions");
    if (!Array.isArray(s.limitations)) missing.push("summary.limitations");
  }
  if (!r.layman_explanation) missing.push("layman_explanation");
  if (!Array.isArray(r.key_concepts)) missing.push("key_concepts");
  if (!Array.isArray(r.evidence_backed_findings)) missing.push("evidence_backed_findings");

  return { valid: missing.length === 0, missing };
}

function resolveOllamaModel(model: unknown) {
  const requestedModel = typeof model === "string" && model.trim() ? model.trim() : DEFAULT_OLLAMA_MODEL;
  if (!requestedModel) {
    throw new Error("No model specified. Select a model from the dropdown.");
  }
  return requestedModel;
}

function extractContextTokens(modelInfo: any): number | null {
  const candidates: number[] = [];

  const visit = (value: unknown, key = "") => {
    if (typeof value === "number" && /context|num_ctx/i.test(key)) {
      candidates.push(value);
      return;
    }

    if (typeof value === "string") {
      const match = value.match(/(?:num_ctx|context_length)\s+(\d+)/i);
      if (match) {
        candidates.push(Number(match[1]));
      }
      return;
    }

    if (value && typeof value === "object") {
      for (const [childKey, childValue] of Object.entries(value)) {
        visit(childValue, childKey);
      }
    }
  };

  visit(modelInfo);
  return candidates.length ? Math.max(...candidates) : null;
}

async function getOllamaModelMetadata(model: string) {
  let contextTokens: number | null = null;
  let loaded = false;

  try {
    const [showResponse, psResponse] = await Promise.all([
      fetch(`${OLLAMA_URL}/api/show`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      }),
      fetch(`${OLLAMA_URL}/api/ps`),
    ]);

    if (showResponse.ok) {
      contextTokens = extractContextTokens(await showResponse.json());
    }

    if (psResponse.ok) {
      const ps = await psResponse.json();
      loaded = Array.isArray(ps.models) && ps.models.some((item: any) => item.name === model || item.model === model);
    }
  } catch (error) {
    console.warn("Unable to read Ollama model metadata:", error);
  }

  return { contextTokens, loaded };
}

function buildInspectionPlan(characterCount: number, estimatedTokens: number, contextTokens: number | null) {
  const usableContextTokens = contextTokens ? Math.floor(contextTokens * 0.75) : null;
  const exceedsContextBudget = usableContextTokens ? estimatedTokens > usableContextTokens : false;
  const tooLong = characterCount > SINGLE_PASS_CHAR_LIMIT || exceedsContextBudget;
  const stronglyRecommendChunking = characterCount > STRONG_CHUNK_CHAR_LIMIT || exceedsContextBudget;

  return {
    recommendedMode: tooLong ? "chunked" : "single",
    requiresConfirmation: tooLong,
    stronglyRecommendChunking,
    reason: tooLong
      ? "This paper is long enough that single-pass analysis may miss later sections."
      : "This paper fits the normal single-pass analysis range.",
    usableContextTokens,
  };
}

function splitTextIntoChunks(text: string, maxChunkCharacters: number) {
  const chunks: string[] = [];

  for (let start = 0; start < text.length; start += maxChunkCharacters) {
    chunks.push(text.slice(start, start + maxChunkCharacters));
  }

  return chunks;
}

type ProgressEvent =
  | { type: "progress"; stage: string; percent: number; detail?: string; metrics?: Record<string, string | number> }
  | { type: "token"; tokenCount: number; percent: number }
  | { type: "final"; data: unknown }
  | { type: "error"; error: string }
  | { type: "done" };

async function analyzeWithOllama(
  prompt: string,
  model: string,
  signal: AbortSignal,
  sendEvent?: (event: ProgressEvent) => void,
) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      format: "json",
      options: {
        temperature: 0.2,
      },
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Ollama returned an empty response stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let resultText = "";
  let tokenCount = 0;

  const processLine = (line: string) => {
    if (!line.trim()) return;

    const chunk = JSON.parse(line);
    if (chunk.response) {
      resultText += chunk.response;
      tokenCount += 1;

      if (tokenCount === 1 || tokenCount % 10 === 0) {
        sendEvent?.({
          type: "token",
          tokenCount,
          percent: Math.min(90, 35 + Math.floor(tokenCount / 25)),
        });
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      processLine(line);
    }
  }

  processLine(buffer);

  if (!resultText) {
    throw new Error("Ollama returned an empty response.");
  }

  try {
    return JSON.parse(resultText);
  } catch (parseError: any) {
    throw new Error(
      `The model's output was truncated and produced invalid JSON. ` +
      `This typically happens when the paper is too long for the model's context window. ` +
      `Try using chunked analysis mode or switch to a model with a larger context window (e.g. gemma4:12b-mlx with 131K context).`
    );
  }
}

async function analyzeWithChunks(
  paperText: string,
  model: string,
  signal: AbortSignal,
  sendEvent: (event: ProgressEvent) => void,
) {
  const chunks = splitTextIntoChunks(paperText, CHUNK_SIZE_CHARS);
  const chunkAnalyses: unknown[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    sendEvent({
      type: "progress",
      stage: `Analyzing chunk ${index + 1} of ${chunks.length}`,
      percent: Math.min(82, 35 + Math.floor((index / chunks.length) * 45)),
      detail: "Reading the paper in multiple passes",
      metrics: { chunks: chunks.length },
    });

    const analysis = await analyzeWithOllama(
      buildChunkPrompt(chunks[index], index + 1, chunks.length),
      model,
      signal,
    );
    chunkAnalyses.push(analysis);
  }

  sendEvent({
    type: "progress",
    stage: "Combining findings",
    percent: 86,
    detail: "Synthesizing chunk analyses into one final summary",
    metrics: { chunks: chunks.length },
  });

  return analyzeWithOllama(buildSynthesisPrompt(chunkAnalyses), model, signal, sendEvent);
}

app.get("/api/models", async (_req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) {
      return res.status(502).json({ error: "Failed to reach Ollama. Is it running?" });
    }
    const data = await response.json();
    const models = (data.models || []).map((m: any) => ({
      name: m.name,
      size: m.size,
      parameterSize: m.details?.parameter_size || null,
      family: m.details?.family || null,
    }));
    res.json({ models, defaultModel: DEFAULT_OLLAMA_MODEL || null });
  } catch (error: any) {
    res.status(502).json({ error: "Cannot connect to Ollama. Is it running at " + OLLAMA_URL + "?" });
  }
});

app.post("/api/models/info", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Model name is required." });
    const metadata = await getOllamaModelMetadata(name);
    res.json({
      model: name,
      contextTokens: metadata.contextTokens,
      loaded: metadata.loaded,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get model info" });
  }
});

app.post("/api/models/pull", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Model name is required." });

    const pullRes = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: name }),
    });

    if (!pullRes.ok) {
      return res.status(502).json({ error: `Failed to pull model "${name}" from Ollama.` });
    }

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reader = pullRes.body?.getReader();
    if (!reader) {
      res.write(JSON.stringify({ status: "done" }) + "\n");
      return res.end();
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          const event: Record<string, unknown> = { status: data.status || "downloading" };
          if (data.completed != null && data.total != null && data.total > 0) {
            event.percent = Math.round((data.completed / data.total) * 100);
          }
          res.write(JSON.stringify(event) + "\n");
        } catch {}
      }
    }

    res.write(JSON.stringify({ status: "done", percent: 100 }) + "\n");
    res.end();
  } catch (error: any) {
    if (res.headersSent) {
      res.write(JSON.stringify({ status: "error", error: error.message }) + "\n");
      return res.end();
    }
    res.status(500).json({ error: error.message || "Failed to pull model" });
  }
});

app.get("/api/history", (_req, res) => {
  res.json({ items: listCachedAnalyses() });
});

app.delete("/api/history", (_req, res) => {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
    }
    res.json({ ok: true, deleted: files.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to clear history" });
  }
});

app.get("/api/history/:id", (req, res) => {
  const { id } = req.params;
  const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), "utf-8")) as CachedAnalysis;
      if (data.id === id) {
        let paperId: string | null = null;
        if (data.paperText) {
          paperId = randomUUID();
          parsedPapers.set(paperId, {
            text: data.paperText,
            createdAt: Date.now(),
          });
        }
        return res.json({ ...data, paperId });
      }
    } catch {
      // skip
    }
  }
  res.status(404).json({ error: "Cached analysis not found." });
});

app.delete("/api/history/:id", (req, res) => {
  const { id } = req.params;
  const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), "utf-8")) as CachedAnalysis;
      if (data.id === id) {
        deleteCachedAnalysis(file.replace(".json", ""));
        return res.json({ ok: true });
      }
    } catch {
      // skip
    }
  }
  res.status(404).json({ error: "Cached analysis not found." });
});

// --- RAG API endpoints ---

app.post("/api/paper/:paperId/embed", async (req, res) => {
  try {
    const { paperId } = req.params;
    const embeddingModel = (req.body?.embeddingModel as string) || EMBEDDING_MODEL;
    const paper = parsedPapers.get(paperId);
    if (!paper) {
      return res.status(404).json({ error: "Paper not found. Please re-upload." });
    }

    await ensureEmbeddingModel(embeddingModel);
    const embeddingCache = await embedPaper(paperId, embeddingModel);
    res.json({
      status: "ready",
      chunkCount: embeddingCache.chunks.length,
      embeddingModel,
    });
  } catch (error: any) {
    console.error("Embed error:", error);
    const msg = error.message || "Failed to embed paper";
    if (msg.includes("pull")) {
      return res.status(500).json({ error: `Embedding model not available. ${msg}` });
    }
    res.status(500).json({ error: msg });
  }
});

app.post("/api/paper/:paperId/chat", async (req, res) => {
  const abortController = new AbortController();
  let responseFinished = false;

  res.on("close", () => {
    if (!responseFinished) {
      abortController.abort();
    }
  });

  const sendEvent = (event: Record<string, unknown>) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const { paperId } = req.params;
    const { question, model, history = [], embeddingModel: reqEmbeddingModel } = req.body;
    const embeddingModel = (reqEmbeddingModel as string) || EMBEDDING_MODEL;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Question is required." });
    }

    const paper = parsedPapers.get(paperId);
    if (!paper) {
      return res.status(404).json({ error: "Paper not found. Please re-upload." });
    }

    const ollamaModel = resolveOllamaModel(model);

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sendEvent({ type: "progress", stage: "Indexing paper", percent: 10 });
    const embeddingCache = await embedPaper(paperId, embeddingModel);

    sendEvent({ type: "progress", stage: "Embedding question", percent: 30 });
    const [questionEmbedding] = await embedTexts([question], embeddingModel);

    sendEvent({ type: "progress", stage: "Retrieving relevant chunks", percent: 50 });
    const topChunks = retrieveTopChunks(questionEmbedding, embeddingCache, 5);

    sendEvent({ type: "progress", stage: "Generating answer", percent: 60 });
    const prompt = buildChatPrompt(question, topChunks, history);

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: true,
        options: { temperature: 0.3 },
      }),
      signal: abortController.signal,
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama request failed: ${ollamaRes.status} ${ollamaRes.statusText}`);
    }

    if (!ollamaRes.body) {
      throw new Error("Ollama returned an empty response stream.");
    }

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line);
        if (chunk.response) {
          sendEvent({ type: "token", text: chunk.response });
        }
      }
    }

    if (buffer.trim()) {
      const chunk = JSON.parse(buffer);
      if (chunk.response) {
        sendEvent({ type: "token", text: chunk.response });
      }
    }

    sendEvent({
      type: "done",
      sources: topChunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        preview: c.text.slice(0, 300) + (c.text.length > 300 ? "..." : ""),
        score: Math.round(c.score * 100) / 100,
      })),
    });
    responseFinished = true;
    res.end();
  } catch (error: any) {
    console.error("Chat error:", error);
    if (abortController.signal.aborted) {
      responseFinished = true;
      return res.end();
    }

    if (res.headersSent) {
      sendEvent({ type: "error", error: error.message || "Failed to generate response" });
      responseFinished = true;
      return res.end();
    }

    res.status(500).json({ error: error.message || "Failed to generate response" });
  }
});

// --- End RAG API endpoints ---

app.post("/api/inspect-paper", async (req, res) => {
  try {
    cleanupParsedPapers();
    const { sourceType, content, model } = req.body;
    const ollamaModel = resolveOllamaModel(model);

    if (!["pdfBase64", "pdfUrl"].includes(sourceType)) {
      return res.status(400).json({ error: "Only PDF uploads and PDF links are supported." });
    }

    if (!content) {
      return res.status(400).json({ error: "PDF content or link is required." });
    }

    const paperText = sourceType === "pdfUrl"
      ? await fetchPdfText(content)
      : await parsePdfText(content);

    if (!paperText) {
      return res.status(422).json({ error: "No extractable text was found in the PDF." });
    }

    const paperId = randomUUID();
    const estimatedTokens = estimateTokens(paperText);
    const modelMetadata = await getOllamaModelMetadata(ollamaModel);
    const plan = buildInspectionPlan(paperText.length, estimatedTokens, modelMetadata.contextTokens);

    parsedPapers.set(paperId, {
      text: paperText,
      sourceLabel: sourceType === "pdfUrl" ? content : undefined,
      createdAt: Date.now(),
    });

    res.json({
      paperId,
      characters: paperText.length,
      estimatedTokens,
      model: ollamaModel,
      modelContextTokens: modelMetadata.contextTokens,
      modelLoaded: modelMetadata.loaded,
      ...plan,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to inspect paper" });
  }
});

// API: Parse uploaded PDF and analyze text with Ollama
app.post("/api/analyze-paper", async (req, res) => {
  console.log("Received analysis request. Source:", req.body.sourceType, "Title:", req.body.title);
  const abortController = new AbortController();
  let responseFinished = false;

  res.on("close", () => {
    if (!responseFinished) {
      abortController.abort();
    }
  });

  const sendEvent = (event: ProgressEvent) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    cleanupParsedPapers();
    const { paperId, model, analysisMode = "single" } = req.body;
    const cachedPaper = typeof paperId === "string" ? parsedPapers.get(paperId) : null;

    if (!cachedPaper) {
      return res.status(404).json({ error: "Parsed paper was not found. Please upload the PDF again." });
    }

    const paperText = cachedPaper.text;
    const ollamaModel = resolveOllamaModel(model);
    const key = cacheKey(paperText, ollamaModel);
    const cached = getCachedAnalysis(key);

    if (cached) {
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      sendEvent({ type: "progress", stage: "Cache hit", percent: 90, detail: "Found a previous analysis for this paper and model" });
      sendEvent({ type: "final", data: cached.result });
      sendEvent({ type: "done" });
      responseFinished = true;
      return res.end();
    }

    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sendEvent({
      type: "progress",
      stage: "PDF uploaded",
      percent: 8,
      detail: "Using extracted PDF text",
      metrics: { model: ollamaModel },
    });

    sendEvent({
      type: "progress",
      stage: "Text extracted",
      percent: 28,
      detail: "Preparing prompt for local analysis",
      metrics: { characters: paperText.length, model: ollamaModel },
    });

    console.log("Sending extracted text to Ollama model:", ollamaModel);
    sendEvent({
      type: "progress",
      stage: "Analyzing locally",
      percent: 35,
      detail: `Running ${ollamaModel} with Ollama`,
      metrics: { characters: paperText.length, model: ollamaModel },
    });

    const analysis = analysisMode === "chunked"
      ? await analyzeWithChunks(paperText, ollamaModel, abortController.signal, sendEvent)
      : await analyzeWithOllama(
        buildPrompt(paperText),
        ollamaModel,
        abortController.signal,
        sendEvent,
      );

    const validation = validateAnalysisResult(analysis);
    if (!validation.valid) {
      console.warn("Analysis incomplete, missing:", validation.missing);
      sendEvent({
        type: "progress",
        stage: "Partial result",
        percent: 95,
        detail: `Some fields are missing (${validation.missing.join(", ")}). Try chunked mode or a model with larger context.`,
      });
    }

    const paperTitle = (analysis as any)?.paper_title || "Untitled Paper";
    setCachedAnalysis(key, {
      id: key,
      paperTitle,
      model: ollamaModel,
      analysisMode: analysisMode as "single" | "chunked",
      characters: paperText.length,
      createdAt: Date.now(),
      result: analysis,
      paperText,
    });

    sendEvent({ type: "progress", stage: "Formatting result", percent: 95, detail: "Validating structured JSON" });
    sendEvent({ type: "final", data: analysis });
    sendEvent({ type: "done" });
    responseFinished = true;
    res.end();
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    if (abortController.signal.aborted) {
      responseFinished = true;
      return res.end();
    }

    if (res.headersSent) {
      sendEvent({ type: "error", error: error.message || "Failed to analyze paper content" });
      responseFinished = true;
      return res.end();
    }

    res.status(500).json({ error: error.message || "Failed to analyze paper content" });
  }
});

async function boot() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

boot();
