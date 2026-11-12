import * as cheerio from "cheerio";
import { scrapeWithFlareSolverr } from "../../helper/httpRequests.ts";
import type { League, ProviderAdapter } from "../interface.js";

const LEAGUE_PAGE_URL = "https://www.sheepesports.com/fr/all/leagues/lec";
const SITE_ORIGIN = "https://www.sheepesports.com";

export const sheepLeagues: ProviderAdapter<League[]> = {
  id: "sheep",
  async fetch() {
    const page = await scrapeWithFlareSolverr(LEAGUE_PAGE_URL);
    if (!page) {
      throw new Error(`Could not load Sheep Esports league page: ${LEAGUE_PAGE_URL}`);
    }

    return parseLeaguePage(page.html, LEAGUE_PAGE_URL);
  },
};

export function parseLeaguePage(html: string, pageUrl: string): League[] {
  const $ = cheerio.load(html);
  const leagues = new Map<string, League>();
  const title = $("h1").first().text().trim();

  if (title) {
    const heading = $("h1").first();
    const id = leagueId(pageUrl);
    const season = $('button[data-slot="popover-trigger"]').first().text().trim();

    leagues.set(id, {
      id,
      sport: "League of Legends",
      league: title,
      leagueShort: null,
      division: null,
      cupId: null,
      currentSeason: season || null,
      country: null,
      logo: resolveImageUrl(heading.parent().prev("img").attr("src")),
    });
  }

  $('a[href^="/fr/all/leagues/"]').has("img").each((_, element) => {
    const link = $(element);
    const href = link.attr("href");
    const name = link.find("span").filter((_, span) => $(span).children().length === 0)
      .first().text().trim();
    if (!href || !name) return;

    const url = new URL(href, SITE_ORIGIN);
    const id = leagueId(url.href);
    if (leagues.has(id)) return;

    leagues.set(id, {
      id,
      sport: "League of Legends",
      league: name,
      leagueShort: name,
      division: null,
      cupId: null,
      currentSeason: null,
      country: null,
      logo: resolveImageUrl(link.find("img").first().attr("src")),
    });
  });

  return [...leagues.values()];
}

function leagueId(url: string): string {
  const slug = new URL(url, SITE_ORIGIN).pathname.split("/").filter(Boolean).pop();
  if (!slug) throw new Error(`Could not determine league id from URL: ${url}`);
  return decodeURIComponent(slug);
}

function resolveImageUrl(src: string | undefined): string | null {
  if (!src) return null;

  const url = new URL(src, SITE_ORIGIN);
  if (url.pathname === "/_next/image") {
    return url.searchParams.get("url") ?? url.href;
  }
  return url.href;
}
