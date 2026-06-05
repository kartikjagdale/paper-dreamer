# Paper Dreamer

A local-first research paper analyzer that turns dense academic PDFs into structured, plain-language summaries using Ollama models running entirely on your machine. No data leaves your computer.

Upload a PDF or paste a link (arXiv, direct PDF URLs), pick a local model, and get back a structured breakdown: layman explanation, methodology, key concepts, evidence-backed findings, and more. Then ask follow-up questions — answers are grounded in the paper via local RAG.

## Features

- **PDF upload or URL** — drag-and-drop a file or paste a public PDF link (arXiv abstract URLs are auto-converted)
- **Fully local analysis** — all processing happens via Ollama on your machine; no external API calls
- **Multi-model support** — use any model available in Ollama; dynamic model list from your local Ollama instance
- **Smart chunking** — long papers are automatically split and analyzed in multiple passes, then synthesized into one coherent summary
- **Structured output** — paper title, abstract, methodology, contributions, limitations, key concepts, evidence-backed findings, research questions, datasets, related work, practical applications, and future work
- **RAG chat** — ask follow-up questions about the paper; answers are grounded in the paper's content via local embeddings (`nomic-embed-text` by default)
- **Analysis caching** — results are saved to disk so revisiting the same paper with the same model is instant
- **History page** — browse, reload, or delete previous analyses
- **Settings page** — set default model, configure embedding model, manage and pull Ollama models in-app
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

For RAG chat, you also need an embedding model:

```bash
ollama pull nomic-embed-text
```

This is downloaded automatically on first chat use if not already present.

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

**Option A — Docker (recommended)**

Requires Docker Desktop. Ollama stays native on your Mac for full GPU acceleration.

```bash
git clone <repo-url> paper-dreamer
cd paper-dreamer
docker compose up
```

**Option B — Node.js directly**

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
2. Select a model from the dropdown (lists all models available in your Ollama, or set a default in Settings)
3. Upload a PDF or paste a PDF link (arXiv links like `https://arxiv.org/abs/2301.00001` are automatically converted to PDF URLs)
4. Click **Analyze Paper**
5. For long papers (>120K characters or exceeding 75% of model context), you'll be asked to confirm chunked analysis
6. View the structured summary — sections include plain-language explanation, methodology, key concepts, evidence-backed findings, and more
7. Use the **Chat** panel to ask follow-up questions; the first question triggers local embedding (downloads `nomic-embed-text` if needed)
8. Previously analyzed papers appear in **History** and can be reloaded instantly from cache

## Configuration

Create a `.env` file in the project root for optional overrides:

```env
# Ollama server URL (default: http://localhost:11434)
OLLAMA_URL=http://localhost:11434

# Default model to pre-select in the UI (optional; can also be set in Settings page)
OLLAMA_MODEL=qwen3:8b
```

Settings (default model, embedding model) can also be configured directly in the app at `/settings`.

## Commands

### npm

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server (Express + Vite) at http://localhost:3000 |
| `npm run build` | Build for production (Vite frontend + esbuild server bundle) |
| `npm start` | Run production build |
| `npm run lint` | Type-check with TypeScript (`tsc --noEmit`) |

### Docker

| Command | Description |
|---|---|
| `docker compose up` | Build image and start the app at http://localhost:3000 |
| `docker compose up --build` | Force rebuild image (after code changes) |
| `docker compose down` | Stop and remove containers |
| `docker compose down -v` | Stop containers and delete the cache volume |

## Architecture

Multi-page React 19 app (React Router) with an Express API server, both served from one process.

```
┌─────────────────────────────────────────────────────┐
│  Browser (React SPA — React Router)                 │
│  /           → HomePage  (analyze + chat)           │
│  /history    → HistoryPage (browse past analyses)   │
│  /settings   → SettingsPage (models, embeddings)    │
└───────────────┬─────────────────────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────────────────────┐
│  Express Server (server.ts)                         │
│  POST /api/inspect-paper      parse PDF, plan mode  │
│  POST /api/analyze-paper      stream Ollama results │
│  GET  /api/models             list Ollama models    │
│  POST /api/models/info        model metadata        │
│  POST /api/models/pull        pull model (streaming)│
│  GET  /api/history            list cached analyses  │
│  GET  /api/history/:id        load cached result    │
│  DELETE /api/history/:id      delete one entry      │
│  DELETE /api/history          clear all history     │
│  POST /api/paper/:id/embed    build RAG index       │
│  POST /api/paper/:id/chat     RAG-grounded Q&A      │
└───────────────┬─────────────────────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────────────────────┐
│  Ollama (local)                                     │
│  /api/generate  streaming JSON generation           │
│  /api/embed     text embeddings (RAG)               │
│  /api/tags      list models                         │
│  /api/show      model metadata / context size       │
│  /api/pull      download models                     │
└─────────────────────────────────────────────────────┘
```

### Key directories

```
server.ts              → Express server, Ollama integration, RAG, caching
src/App.tsx            → Router setup
src/pages/             → HomePage, HistoryPage, SettingsPage
src/components/        → InputPanel, ResultsView, ChatPanel, HistoryPanel, etc.
src/hooks/             → useAnalysis, useModels, useHistory, useSettings
src/types.ts           → Shared TypeScript interfaces
.cache/analyses/       → Disk-persisted analysis cache (gitignored)
.cache/embeddings/     → Disk-persisted RAG embedding cache (gitignored)
```

### Data flow

1. **Upload/URL** → `POST /api/inspect-paper` (parse PDF, check size vs model context)
2. If long paper → user confirms single-pass or chunked mode
3. **Analyze** → `POST /api/analyze-paper` (checks cache first; if miss, streams Ollama generation as NDJSON)
4. On success → result cached to `.cache/analyses/` keyed by `sha256(paperText + model)`
5. **Chat** → first question triggers `POST /api/paper/:id/embed` (builds embedding index, cached to `.cache/embeddings/`), then `POST /api/paper/:id/chat` retrieves top-K chunks and streams an answer
6. **History** → cached results are listed at `/history` and can be reloaded instantly

## Tech Stack

- **Frontend:** React 19, React Router v7, Tailwind CSS v4, Lucide icons, Vite
- **Backend:** Express, pdf-parse, Node.js crypto (for cache keys)
- **LLM Runtime:** Ollama (local) — generation + embeddings
- **Language:** TypeScript throughout

## Development

```bash
npm run dev
```

This starts Express with Vite middleware for hot-reload. The frontend is served at the same port as the API (no CORS needed).

### Docker setup

The Docker setup uses a **3-stage build** to keep the image lean:

1. **deps** — installs `node_modules` via `npm ci`
2. **builder** — runs `npm run build` (Vite frontend + esbuild server bundle → `dist/`)
3. **runner** — copies only `dist/` and `node_modules` into a clean Alpine image

Ollama runs natively on your Mac (full Metal GPU). The container reaches it via `host.docker.internal:11434`, which Docker resolves to the host machine automatically.

The `.cache/` directory (analysis results + RAG embeddings) is mounted as a named Docker volume (`paper-dreamer-cache`) so cached results survive container restarts and rebuilds.

After changing code, rebuild the image:

```bash
docker compose up --build
```

### Adding a new model

No code changes needed — any model pulled into Ollama appears automatically in the model dropdown. Models can also be pulled directly from the Settings page (`/settings`).

### Type checking

```bash
npm run lint
```

No test framework is configured. Validate changes with type-checking and manual testing in the browser.

## License

Copyright (C) 2026 kartik.jagdale

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** with an additional restriction on AI training use.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![No AI Training](https://img.shields.io/badge/No_AI_Training-red.svg)](#)

### What this means

- **Use freely** — run, study, and modify the software for any permitted purpose
- **Share alike** — if you distribute or host a modified version (including as a web service), you must publish the source under AGPL-3.0
- **No AI training** — you may not use this software or any part of it to train, fine-tune, distill, or otherwise develop machine learning or AI models without explicit written permission from the copyright holder

See the [`LICENSE`](./LICENSE) file for the full terms.
