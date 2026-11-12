import { getProviderClient } from "../client.ts";
import type { League, ProviderAdapter } from "../interface.ts";

const API_URL = "https://lol.fandom.com/api.php";
const CACHE_DURATION_MS = 60 * 60 * 1000;

let cache: { fetchedAt: number; leagues: League[] } | undefined;
let pendingFetch: Promise<League[]> | undefined;

interface CargoQueryResponse {
  cargoquery: Array<{
    title: {
      League?: unknown;
    };
  }>;
}

interface WikiQueryResponse {
  query?: {
    pages?: Array<{
      revisions?: Array<{
        slots?: {
          main?: {
            content?: unknown;
          };
        };
      }>;
    }>;
  };
}

export const leaguepediaLeagues: ProviderAdapter<League[]> = {
  id: "leaguepedia",
  async fetch() {
    if (cache && Date.now() - cache.fetchedAt < CACHE_DURATION_MS) return cache.leagues;
    if (!pendingFetch) {
      pendingFetch = fetchLeagues()
        .then((leagues) => {
          cache = { fetchedAt: Date.now(), leagues };
          return leagues;
        })
        .finally(() => {
          pendingFetch = undefined;
        });
    }
    return pendingFetch;
  },
};

async function fetchLeagues(): Promise<League[]> {
  const cargoUrl = new URL(API_URL);
  cargoUrl.search = new URLSearchParams({
    action: "cargoquery",
    format: "json",
    tables: "Tournament",
    fields: "League",
    where: "League IS NOT NULL",
    group_by: "League",
    order_by: "League ASC",
    limit: "max",
  }).toString();

  const client = getProviderClient("leaguepedia");
  const cargoBody = await client.get(cargoUrl, {
    headers: { accept: "application/json" },
  });
  const shortNames = parseLeagueShortNames(cargoBody);
  const leagues: League[] = [];

  for (const batch of chunks(shortNames, 50)) {
    const url = new URL(API_URL);
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      titles: batch.join("|"),
      redirects: "1",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
    }).toString();
    const body = await client.get(url, { headers: { accept: "application/json" } });
    leagues.push(...parseLeaguePages(body, batch));
  }

  return leagues;
}

export function parseLeagueShortNames(body: string): string[] {
  const parsed: unknown = JSON.parse(body);
  if (!isCargoQueryResponse(parsed)) {
    throw new Error("Leaguepedia returned an invalid league list");
  }

  const names = new Map<string, string>();
  for (const result of parsed.cargoquery) {
    const name = result.title.League;
    if (typeof name !== "string" || !name.trim()) continue;

    const shortName = name.trim();
    const key = normalize(shortName);
    if (names.has(key)) continue;
    names.set(key, shortName);
  }

  return [...names.values()];
}

export function parseLeaguePages(body: string, shortNames: string[]): League[] {
  const parsed: unknown = JSON.parse(body);
  if (!isWikiQueryResponse(parsed)) {
    throw new Error("Leaguepedia returned an invalid league detail response");
  }

  const fallbackNames = new Map(shortNames.map((name) => [normalize(name), name]));
  const leagues = new Map<string, League>();
  for (const page of parsed.query.pages) {
    const content = page.revisions?.[0]?.slots?.main?.content;
    if (typeof content !== "string") continue;

    const shortName = parameter(content, "short");
    if (!shortName) continue;

    const key = normalize(shortName);
    const knownShortName = fallbackNames.get(key);
    if (!knownShortName || leagues.has(key)) continue;
    const longName = parameter(content, "long") ?? knownShortName;
    leagues.set(key, {
      id: knownShortName,
      sport: "League of Legends",
      league: expandLeagueName(longName),
      leagueShort: knownShortName,
      division: null,
      cupId: null,
      currentSeason: null,
      country: null,
      logo: null,
    });
  }

  const unresolved = shortNames.filter((name) => !leagues.has(normalize(name)));
  if (unresolved.length > 0) {
    throw new Error(`Leaguepedia could not resolve full names for: ${unresolved.join(", ")}`);
  }

  return [...leagues.values()];
}

function parameter(content: string, name: string): string | undefined {
  const match = content.match(new RegExp(`\\|\\s*${name}\\s*=\\s*([^|}\\r\\n]+)`, "i"));
  return match?.[1]?.trim() || undefined;
}

function expandLeagueName(name: string): string {
  return name.replace(/^LoL\s+/, "League of Legends ");
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isCargoQueryResponse(value: unknown): value is CargoQueryResponse {
  if (typeof value !== "object" || value === null || !("cargoquery" in value)) return false;
  const { cargoquery } = value;
  return Array.isArray(cargoquery) && cargoquery.every(
    (result) =>
      typeof result === "object" &&
      result !== null &&
      "title" in result &&
      typeof result.title === "object" &&
      result.title !== null,
  );
}

function isWikiQueryResponse(value: unknown): value is WikiQueryResponse & {
  query: { pages: NonNullable<WikiQueryResponse["query"]>["pages"] & object };
} {
  if (typeof value !== "object" || value === null || !("query" in value)) return false;
  const query = value.query;
  return typeof query === "object" && query !== null && "pages" in query &&
    Array.isArray(query.pages);
}