import type { QueryResultRow } from "pg";
import { pool } from "../db/pool.ts";
import type { League } from "../providers/interface.ts";

interface LeagueRow extends QueryResultRow {
  id_league: number;
  name: string;
  alternate_name: string | null;
  sport: string;
  country: string | null;
  badge_url: string | null;
}

export async function listLeagues(): Promise<League[]> {
  const { rows } = await pool.query<LeagueRow>(`
    SELECT id_league,
           name,
           alternate_name,
           sport,
           country,
           badge_url
    FROM leagues
    ORDER BY name
  `);

  return rows.map((row) => ({
    id: String(row.id_league),
    league: row.name,
    leagueShort: row.alternate_name,
    sport: row.sport,
    division: null,
    cupId: null,
    currentSeason: null,
    country: row.country,
    logo: row.badge_url,
  }));
}