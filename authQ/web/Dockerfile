# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
ARG NEXT_PUBLIC_APIGATE_URL=http://localhost:18080
ARG NEXT_PUBLIC_COMDASH_URL=http://localhost:13000
ARG NEXT_PUBLIC_LOGIN_DEV_BYPASS=false
ARG NEXT_PUBLIC_ERPNEXT_SITE_LABEL=ERPNext
ENV NEXT_PUBLIC_APIGATE_URL=$NEXT_PUBLIC_APIGATE_URL
ENV NEXT_PUBLIC_COMDASH_URL=$NEXT_PUBLIC_COMDASH_URL
ENV NEXT_PUBLIC_LOGIN_DEV_BYPASS=$NEXT_PUBLIC_LOGIN_DEV_BYPASS
ENV NEXT_PUBLIC_ERPNEXT_SITE_LABEL=$NEXT_PUBLIC_ERPNEXT_SITE_LABEL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
