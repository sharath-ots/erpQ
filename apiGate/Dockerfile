# syntax=docker/dockerfile:1
# From monorepo root: docker build -f apiGate/Dockerfile -t cityq/apigate:latest .
FROM node:20-alpine AS build
WORKDIR /repo
COPY frappeRestQ ./frappeRestQ
RUN cd frappeRestQ && npm install && npm run build

COPY apiGate ./apiGate
WORKDIR /repo/apiGate
RUN npm install && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apiGate/package.json ./
RUN npm install --omit=dev
COPY --from=build /repo/apiGate/dist ./dist
# copy-frappe.mjs places @cityq/frapperestq under apiGate/node_modules at build time; it is not in package.json
COPY --from=build /repo/apiGate/node_modules/@cityq ./node_modules/@cityq
EXPOSE 8080
USER node
CMD ["node", "dist/server.js"]
