import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { registerRoutes } from "./routes/index.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

const jwtSecret = process.env.JWT_SECRET ?? "development-only-change-me";
await app.register(jwt, { secret: jwtSecret });

await registerRoutes(app);

const port = Number(process.env.PORT ?? 4100);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
