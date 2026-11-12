import type { FastifyInstance } from "fastify";
import { listTeams } from "../services/team.ts";

export async function teamRoutes(app: FastifyInstance): Promise<void> {
  app.get("/teams", async () => ({
    teams: await listTeams(),
  }));
}