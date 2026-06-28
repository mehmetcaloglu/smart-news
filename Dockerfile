# ---- Build Stage ----
FROM node:20-alpine AS builder

# Native module deps (better-sqlite3 needs python + build tools)
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner

RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/config ./config

# Data dir (will be mounted as a volume in production)
RUN mkdir -p /app/data

# SQLite data volume
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npm", "start"]
