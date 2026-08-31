FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY agents/ ./agents/
COPY apps/api/ ./apps/api/

RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @docsetuai/types run build
RUN pnpm --filter @docsetuai/config run build
RUN pnpm --filter @docsetuai/api run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

COPY --from=builder /app ./

CMD ["node", "apps/api/dist/index.js"]
