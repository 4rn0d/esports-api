import type { QueryResultRow } from "pg";
import { pool } from "../db/pool.ts";
import type { Team } from "../providers/interface.ts";

interface TeamRow extends QueryResultRow {
  id_team: number;
  name: string;
  short_name: string | null;
  sport: string;
  country: string | null;
  badge_url: string | null;
}

export async function listTeams(): Promise<Team[]> {
  const { rows } = await pool.query<TeamRow>(`
    SELECT id_team,
           name,
           short_name,
           sport,
           country,
           badge_url
    FROM teams
    ORDER BY name
  `);

  return rows.map((row) => ({
    id: String(row.id_team),
    team: row.name,
    teamShort: row.short_name,
    sport: row.sport,
    league: null,
    leagueId: null,
    league2: null,
    league2Id: null,
    league3: null,
    league3Id: null,
    league4: null,
    league4Id: null,
    country: row.country,
    badge: row.badge_url,
  }));
}