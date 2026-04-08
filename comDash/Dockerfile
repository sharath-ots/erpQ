# syntax=docker/dockerfile:1
# Build from monorepo root: docker build -f comDash/Dockerfile -t erpq/comdash:latest .
FROM node:20-alpine AS deps
WORKDIR /repo
COPY comDash/package.json comDash/package-lock.json* ./comDash/
WORKDIR /repo/comDash
RUN npm ci 2>/dev/null || npm install

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/comDash/node_modules ./comDash/node_modules
COPY crmQ ./crmQ
COPY comDash ./comDash
WORKDIR /repo/crmQ
RUN npm install --omit=dev
WORKDIR /repo/comDash
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build /repo/comDash/public ./public
COPY --from=build --chown=nextjs:nodejs /repo/comDash/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/comDash/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
