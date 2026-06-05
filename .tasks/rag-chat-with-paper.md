# PRD: RAG — Chat With Your Paper

## Problem

After a paper is summarized, users may want to ask follow-up questions: "Explain section 3 in more detail", "What does the author mean by X?", "How does this compare to Y?" Currently the app is one-shot — analyze and display. There's no way to interactively interrogate the paper.

## Goal

Add a **"Chat with this paper"** feature powered by Retrieval-Augmented Generation (RAG). The user gets a conversational interface (already scaffolded as a tab in the results panel) scoped to the paper's content, with optional web search for related context.

## Scope

- **In scope:** Single-paper Q&A, local embeddings, hybrid retrieval, streamed responses, optional web search for related context
- **Out of scope:** Cross-paper queries, persistent chat history across sessions, multi-document libraries, cloud LLM APIs

## Why RAG (not just full-context)

- Most local models have 4K–8K context windows. A full paper + question + history won't fit.
- RAG retrieves only the 4–5 most relevant chunks per question, keeping prompts small and answers focused.
- The real quality ceiling is the local model's reasoning ability, not the retrieval layer.

## Technical Decisions

### Vector Search: Hand-rolled cosine similarity

At single-paper scale (50–200 chunks), a flat array with cosine similarity is sufficient:
- Zero dependencies
- Microsecond search time at this scale
- No external DB, no native binaries, no Docker sidecars
- Trivial to cache as JSON alongside the analysis results

If hybrid search (keyword + semantic) proves necessary later, **Orama** (`@orama/orama`, zero deps, in-process) is the upgrade path — swap in without architectural changes.

### Embedding Model: Ollama `nomic-embed-text`

- 768-dimensional vectors
- Already available locally (user has it pulled)
- Decent for general text; not specialized for scientific vocabulary but adequate for this use case
- Called via `POST /api/embed`

### Chunking Strategy

- **Chunk size:** 1000 characters with 200-character overlap (same approach as freeCodeCamp RAG tutorial)
- **Paragraph-aware splitting:** prefer splitting at paragraph boundaries (`\n\n`) rather than mid-sentence
- **Rationale:** too large → embeddings lose specificity; too small → context is lost. 1000/200 is the proven default for document Q&A.
- Store chunk position index for citation references

### LLM for Chat: Same model user selected for analysis

- No separate model needed — reuse whatever is in the model selector (qwen3:8b, gemma3:12b, etc.)
- Stream responses via existing NDJSON infrastructure

### Web Search (Optional): SearXNG or `duck-duck-scrape`

For fully free, no-API-key web search:
- **Option A: `duck-duck-scrape`** — npm package, no key, zero-cost. Fragile (scraping) but simplest.
- **Option B: SearXNG** — self-hosted, aggregates engines. More robust but needs Docker.
- **Option C: Tavily** — best quality, free tier, but requires API key signup.

Recommendation: Start with `duck-duck-scrape` for MVP. User clicks a "Search web" button explicitly — it's not automatic. Results are fed as additional context alongside paper chunks.

**Important:** The search hits the internet; the *processing* of results is local (Ollama). This isn't fully offline but the user opts in per-query.

## Architecture

```
User question
    │
    ├──→ Embed question (Ollama /api/embed → nomic-embed-text)
    │
    ├──→ Cosine similarity search (top-5 chunks from paper)
    │
    ├──→ [If user clicked "Search web"] duck-duck-scrape → top 3 snippets
    │
    └──→ Build prompt:
         [system instructions]
         [retrieved paper chunks]
         [web snippets if any]
         [last 3-5 chat turns]
         [user question]
              │
              └──→ Ollama /api/generate (stream) → Chat UI
```

## API Design

### `POST /api/paper/:paperId/embed`

Embeds the paper text into chunks. Called on first chat message (lazy — not on analysis completion).

**Response:**
```json
{ "status": "ready", "chunkCount": 42, "embeddingModel": "nomic-embed-text" }
```

Embeddings are cached to `.cache/embeddings/<sha256-of-text>.json` so re-opening a paper's chat is instant.

### `POST /api/paper/:paperId/chat`

Streams a response using RAG.

**Request:**
```json
{
  "question": "What dataset did they use for evaluation?",
  "model": "qwen3:8b",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "webSearch": false
}
```

**Response:** NDJSON stream (same pattern as analyze-paper):
```
{"type": "progress", "stage": "Retrieving chunks", "percent": 20}
{"type": "progress", "stage": "Generating answer", "percent": 50}
{"type": "token", "text": "The authors used..."}
{"type": "done", "sources": [{"chunkIndex": 3, "preview": "..."}]}
```

### `POST /api/web-search`

Proxy for web search (keeps API keys server-side if using Tavily later).

**Request:**
```json
{ "query": "attention mechanism transformer 2017 comparison" }
```

**Response:**
```json
{ "results": [{"title": "...", "snippet": "...", "url": "..."}] }
```

## UI Design (already scaffolded)

The Chat tab already exists in `ResultsPanel.tsx` → `ChatPanel.tsx`. To wire up:

1. **First message** triggers `/api/paper/:paperId/embed` with a "Indexing paper..." loader
2. **Subsequent messages** go through `/api/paper/:paperId/chat`
3. **"Search web" toggle** — a small button/checkbox next to the send button. When enabled, the query also hits web search and includes snippets in context.
4. **Source citations** — after each answer, show which chunk indices were used (clickable to scroll to that section in Summary tab)
5. **Suggested questions** — already in place, wire them to actually send

## Implementation Steps

1. **Embedding infrastructure** — chunking function, Ollama `/api/embed` wrapper, cosine similarity util, cache to disk
2. **`/api/paper/:paperId/embed` endpoint** — chunk text, embed each chunk, cache result
3. **`/api/paper/:paperId/chat` endpoint** — embed question, retrieve top-5, build prompt, stream response
4. **Wire ChatPanel.tsx** — replace placeholder setTimeout with real API calls, show sources
5. **Web search** — install `duck-duck-scrape`, add `/api/web-search` endpoint, add toggle in ChatPanel
6. **Embedding model check** — on app load, verify `nomic-embed-text` is pulled; show a note in the fallback screen if not

## Quality Expectations (honest)

- For general Q&A ("what method did they use?", "explain the results") → **good answers** from 8B models
- For dense math/architecture papers (Hugging Face daily papers, novel architectures) → **~70% quality** with 8B models. The ceiling is the model, not the retrieval.
- Web search adds breadth but the local model may struggle to synthesize complex external context with paper content
- Larger models (70B+) would improve quality significantly but require more RAM

## Dependencies

- `nomic-embed-text` must be pulled in Ollama (768-dim embeddings)
- `duck-duck-scrape` npm package (for web search, ~97KB)
- No other external dependencies

## Open Questions (resolved)

- [x] ~~Vector store choice~~ → Hand-rolled cosine similarity. Upgrade path: Orama.
- [x] ~~Auto-embed or lazy?~~ → Lazy (on first chat message)
- [x] ~~Web search approach~~ → `duck-duck-scrape` for MVP, upgrade to Tavily/Brave if fragile
- [ ] Should chat history persist to disk or be session-only? (Leaning: session-only for MVP)
- [ ] Chunk size tuning — start with 1000/200, may need adjustment for papers with lots of equations/tables

## Priority

Next up — result caching and history are done. The Chat tab UI shell is already in place.
