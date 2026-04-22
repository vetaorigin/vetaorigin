FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
CMD node -e "require('http').get('http://localhost:3003/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

EXPOSE 3003

CMD ["node", "src/index.js"]