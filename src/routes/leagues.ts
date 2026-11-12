import type { FastifyInstance } from "fastify";
import { listLeagues } from "../services/league.ts";

export async function leagueRoutes(app: FastifyInstance): Promise<void> {
  app.get("/leagues", async () => ({
    leagues: await listLeagues(),
  }));
}