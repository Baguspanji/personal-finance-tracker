# ==========================================
# 1. Base Image & Working Directory
# ==========================================
FROM node:20-alpine AS base
WORKDIR /app

# ==========================================
# 2. Dependencies
# ==========================================
FROM base AS dependencies
COPY package.json package-lock.json* ./
RUN npm install

# ==========================================
# 3. Build Stage
# ==========================================
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ==========================================
# 4. Production Runner
# ==========================================
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database

EXPOSE 3000

CMD ["npm", "start"]
