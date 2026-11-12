import Fastify from "fastify";
import { pool } from "./db/pool.ts";
import { leagueRoutes } from "./routes/leagues.ts";
import { teamRoutes } from "./routes/teams.ts";

const app = Fastify({ logger: true });

app.register(teamRoutes);
app.register(leagueRoutes);

app.get("/health", async (_request, reply) => {
  try {
    await pool.query("SELECT 1");
    return { status: "ok", database: "connected" };
  } catch (error) {
    app.log.error(error, "Database health check failed");
    return reply.code(503).send({ status: "unavailable", database: "disconnected" });
  }
});

app.addHook("onClose", async () => {
  await pool.end();
});

const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ host: "0.0.0.0", port });
} catch (error) {
  app.log.error(error, "Failed to start API");
  await app.close();
  process.exitCode = 1;
}
