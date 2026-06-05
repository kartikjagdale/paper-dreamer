# Stage 1: install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: build frontend + server bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Only copy what's needed to run
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Cache directories (analyses + embeddings) are mounted as a volume at runtime
RUN mkdir -p .cache/analyses .cache/embeddings

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
