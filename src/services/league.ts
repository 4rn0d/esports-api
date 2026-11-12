import type { QueryResultRow } from "pg";
import { pool } from "../db/pool.ts";
import { leaguepediaLeagues } from "../providers/leaguepedia/leagues.ts";
import { mergeLeaguepediaLeagues } from "../providers/leaguepedia/merge.ts";
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

  const leagues = rows.map((row) => ({
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

  return mergeLeaguepediaLeagues(leagues, await leaguepediaLeagues.fetch());
}