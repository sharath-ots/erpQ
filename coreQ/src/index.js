import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { registerRoutes } from "./routes/index.js";

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors, { origin: true });
await registerRoutes(app);

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
