# ---- Build Stage ----
FROM node:20-slim AS builder

# Native module deps (better-sqlite3 needs python + build tools)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-slim AS runner

# Runtime native deps
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/config ./config

# Data dir — mounted as persistent volume in production
RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npm", "start"]
