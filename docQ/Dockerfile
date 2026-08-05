# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY docQ/package.json docQ/package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frappeRestQ /frappeRestQ
COPY docQ/package.json docQ/package-lock.json* ./
COPY docQ/scripts ./scripts
COPY docQ/src ./src
COPY docQ/migrations ./migrations
RUN node scripts/copy-frappe.mjs && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY docQ/package.json docQ/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist/migrations ./migrations
COPY --from=build /app/dist/vendor ./vendor
EXPOSE 14160
USER node
CMD ["node", "dist/index.js"]
