import type { League } from "../interface.js";

export function mergeLeaguepediaLeagues(
  existing: League[],
  leaguepedia: League[],
): League[] {
  const providerByShortName = new Map(
    leaguepedia.map((league) => [
      normalize(league.leagueShort ?? league.league),
      league,
    ]),
  );
  const grouped = new Map<string, League[]>();
  const unmatched: League[] = [];

  for (const league of existing) {
    const shortName = normalize(league.leagueShort ?? league.league);
    if (!providerByShortName.has(shortName)) {
      unmatched.push(league);
      continue;
    }

    const group = grouped.get(shortName) ?? [];
    group.push(league);
    grouped.set(shortName, group);
  }

  const merged = [...unmatched];
  for (const [shortName, group] of grouped) {
    const canonical = [...group].sort((a, b) =>
      Number(normalize(a.league) === shortName) - Number(normalize(b.league) === shortName),
    )[0];
    const enriched = group.reduce((result, league) => fillMissing(result, league), canonical);
    merged.push(fillMissing(enriched, providerByShortName.get(shortName)!));
  }

  return merged.sort((a, b) => a.league.localeCompare(b.league));
}

function fillMissing(primary: League, supplemental: League): League {
  const primaryNameIsShortCode =
    normalize(primary.league) === normalize(supplemental.leagueShort ?? "");
  return {
    ...primary,
    league: primaryNameIsShortCode ? supplemental.league : primary.league || supplemental.league,
    leagueShort: primary.leagueShort || supplemental.leagueShort,
    sport: primary.sport === "Esports" ? supplemental.sport : primary.sport || supplemental.sport,
    division: primary.division || supplemental.division,
    cupId: primary.cupId || supplemental.cupId,
    currentSeason: primary.currentSeason || supplemental.currentSeason,
    country: primary.country || supplemental.country,
    logo: primary.logo || supplemental.logo,
  };
}

function normalize(value: string | null): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}
