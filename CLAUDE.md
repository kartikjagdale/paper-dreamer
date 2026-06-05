# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start Express + Vite dev server at http://0.0.0.0:3000
- `npm run build` — build frontend (Vite) and bundle server (esbuild → dist/server.cjs)
- `npm start` — run production build
- `npm run lint` — type-check with `tsc --noEmit`

Ollama must be running locally before using the app. Default: `OLLAMA_URL=http://localhost:11434`, model `gemma4:12b-mlx`. Pull models with `ollama pull gemma4:12b-mlx` and `ollama pull qwen3:8b`.

## Architecture

Single-page React app with an Express API server, both in one process.

**Server (`server.ts`):** Express app exposing two endpoints:
- `POST /api/inspect-paper` — accepts PDF (base64 or URL), parses text, checks paper size against model context, returns an inspection plan (single vs chunked analysis). Caches parsed text in memory keyed by UUID (30-min TTL).
- `POST /api/analyze-paper` — takes a `paperId` from inspection, streams NDJSON progress events to the client while Ollama generates a structured JSON analysis. Supports single-pass and multi-pass (chunked) modes for long papers.

**Frontend (`src/App.tsx`):** Single component handling file upload/URL input, model selection, streaming progress display, and result rendering. Consumes the NDJSON stream from the server with `ReadableStream`.

**Shared types (`src/types.ts`):** `AnalysisResponse` interface defining the JSON shape returned by Ollama. Keep this in sync with the prompt schema in `server.ts`.

**Data flow:** Upload/URL → inspect-paper (parse PDF, size check) → user confirms mode if long → analyze-paper (Ollama streaming) → structured result displayed.

## Style

- TypeScript throughout; two-space indent
- Single quotes in frontend files, double quotes in `server.ts`
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no tailwind.config — uses CSS-first configuration)
- Path alias: `@/*` maps to project root
- React 19 function components; no class components
- No test framework configured — validate changes with `npm run lint` and manual testing

## Key Constraints

- The server accepts JSON payloads up to 50MB (for base64 PDF uploads)
- arXiv abstract URLs are auto-converted to PDF URLs in `normalizePdfUrl`
- Papers over 60K chars or exceeding 75% of model context trigger the chunked analysis confirmation flow
- Ollama model whitelist is hardcoded in `OLLAMA_MODELS` (server and client must match)
