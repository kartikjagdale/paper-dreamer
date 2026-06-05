# Paper Dreamer

A local-first research paper analyzer that turns dense academic PDFs into structured, plain-language summaries using Ollama models running entirely on your machine. No data leaves your computer.

Upload a PDF or paste a link (arXiv, direct PDF URLs), pick a local model, and get back a structured breakdown: layman explanation, methodology, key concepts, evidence-backed findings, and more.

## Features

- **PDF upload or URL** — drag-and-drop a file or paste a public PDF link (arXiv abstract URLs are auto-converted)
- **Fully local analysis** — all processing happens via Ollama on your machine; no external API calls
- **Multi-model support** — use any model available in Ollama (Qwen, Gemma, LLaMA, Mistral, etc.)
- **Smart chunking** — long papers are automatically split and analyzed in multiple passes, then synthesized into one coherent summary
- **Structured output** — paper title, abstract, methodology, contributions, limitations, key concepts, evidence-backed findings, research questions, datasets, related work, practical applications, and future work
- **Analysis caching** — results are saved to disk so revisiting the same paper with the same model is instant
- **History panel** — browse, reload, or delete previous analyses
- **Ollama setup guidance** — if Ollama isn't running or no models are installed, a helpful onboarding screen walks you through setup

## Prerequisites

| Requirement | Minimum | Notes |
|---|---|---|
| **Node.js** | v18+ | Required to run the dev server |
| **Ollama** | Latest | Local LLM runtime — [ollama.com](https://ollama.com) |
| **A pulled model** | Any | At least one model must be available in Ollama |
| **RAM** | 8 GB+ | Depends on model size (see below) |

### Recommended models

| Model | Size on disk | RAM needed | Best for |
|---|---|---|---|
| `qwen3:8b` | ~5 GB | ~8 GB | Good balance of speed and quality |
| `gemma3:4b` | ~2.5 GB | ~4 GB | Fast results, shorter papers |
| `gemma4:12b-mlx` | ~10 GB | ~12 GB | Higher quality, Apple Silicon optimized |

## Getting Started

### 1. Install Ollama

```bash
# macOS (Homebrew)
brew install ollama

# Or download from https://ollama.com
# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Start Ollama and pull a model

```bash
ollama serve

# In another terminal, pull at least one model:
ollama pull qwen3:8b
```

### 3. Install dependencies and run

```bash
git clone <repo-url> paper-dreamer
cd paper-dreamer
npm install
npm run dev
```

The app will be available at **http://localhost:3000**.

If Ollama is not running or has no models, the app shows a setup screen with instructions instead of failing silently.

## Usage

1. Open http://localhost:3000
2. Select a model from the dropdown (lists all models available in your Ollama)
3. Upload a PDF or paste a PDF link (arXiv links like `https://arxiv.org/abs/2301.00001` are automatically converted to PDF URLs)
4. Click **Analyze Paper**
5. For long papers (>40K characters or exceeding 75% of model context), you'll be asked to confirm chunked analysis
6. View the structured summary — sections include plain-language explanation, methodology, key concepts, evidence-backed findings, and more
7. Previously analyzed papers appear in the **Recent Analyses** panel and can be reloaded instantly from cache

## Configuration

Create a `.env.local` file in the project root for optional overrides:

```env
# Ollama server URL (default: http://localhost:11434)
OLLAMA_URL=http://localhost:11434

# Default model to pre-select in the UI (optional)
OLLAMA_MODEL=qwen3:8b
```

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server (Express + Vite) at http://localhost:3000 |
| `npm run build` | Build for production (Vite frontend + esbuild server bundle) |
| `npm start` | Run production build |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |

## Architecture

Single-page React 19 app with an Express API server, both served from one process.

```
┌─────────────────────────────────────────────────────┐
│  Browser (React SPA)                                │
│  - Upload/URL input, model selection                │
│  - Streams NDJSON progress from server              │
│  - Renders structured results                       │
│  - History panel (loads cached results)             │
└───────────────┬─────────────────────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────────────────────┐
│  Express Server (server.ts)                         │
│  - POST /api/inspect-paper  → parse PDF, plan mode  │
│  - POST /api/analyze-paper  → stream Ollama results │
│  - GET  /api/models         → list Ollama models    │
│  - GET  /api/history        → list cached analyses  │
│  - GET  /api/history/:id    → load cached result    │
│  - DELETE /api/history/:id  → delete one entry      │
│  - DELETE /api/history       → clear all history     │
└───────────────┬─────────────────────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────────────────────┐
│  Ollama (local)                                     │
│  - /api/generate (streaming JSON generation)        │
│  - /api/tags    (list models)                       │
│  - /api/show    (model metadata/context size)       │
└─────────────────────────────────────────────────────┘
```

### Key directories

```
server.ts              → Express server, Ollama integration, caching
src/App.tsx            → Root component, layout orchestration
src/components/        → UI components (InputPanel, ResultsView, HistoryPanel, etc.)
src/hooks/             → React hooks (useAnalysis, useModels, useHistory)
src/types.ts           → Shared TypeScript interfaces
.cache/analyses/       → Disk-persisted analysis cache (gitignored)
```

### Data flow

1. **Upload/URL** → `POST /api/inspect-paper` (parse PDF, check size vs model context)
2. If long paper → user confirms single-pass or chunked mode
3. **Analyze** → `POST /api/analyze-paper` (checks cache first; if miss, streams Ollama generation as NDJSON)
4. On success → result cached to `.cache/analyses/` keyed by `sha256(paperText + model)`
5. **History** → cached results are listed in the sidebar and can be reloaded instantly

## Tech Stack

- **Frontend:** React 19, Tailwind CSS v4, Lucide icons, Vite
- **Backend:** Express, pdf-parse, Node.js crypto (for cache keys)
- **LLM Runtime:** Ollama (local)
- **Language:** TypeScript throughout

## Development

```bash
npm run dev
```

This starts Express with Vite middleware for hot-reload. The frontend is served at the same port as the API (no CORS needed).

### Adding a new model

No code changes needed — any model pulled into Ollama appears automatically in the model dropdown. The app dynamically queries `GET /api/models` on load.

### Type checking

```bash
npm run lint
```

No test framework is configured. Validate changes with type-checking and manual testing in the browser.
