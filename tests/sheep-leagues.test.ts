import assert from "node:assert/strict";
import test from "node:test";
import { parseLeaguePage } from "../src/providers/sheep/leagues.js";

test("parses the current league and linked league cards", () => {
  const html = `
    <header>
      <img src="/_next/image?url=https%3A%2F%2Fassets.sheepesports.com%2Flec.png&w=128&q=100">
      <div><h1>LEC</h1></div>
      <button data-slot="popover-trigger">2026 Summer</button>
    </header>
    <aside aria-label="Matchs">
      <a href="/fr/all/leagues/lck">
        <img src="/_next/image?url=https%3A%2F%2Fassets.sheepesports.com%2Flck.png&w=48&q=100">
        <span><span><span>LCK</span></span><span>Playoffs</span></span>
      </a>
    </aside>
  `;

  assert.deepEqual(parseLeaguePage(html, "https://www.sheepesports.com/fr/all/leagues/lec"), [
    {
      id: "lec",
      sport: "League of Legends",
      league: "LEC",
      leagueShort: null,
      division: null,
      cupId: null,
      currentSeason: "2026 Summer",
      country: null,
      logo: "https://assets.sheepesports.com/lec.png",
    },
    {
      id: "lck",
      sport: "League of Legends",
      league: "LCK",
      leagueShort: "LCK",
      division: null,
      cupId: null,
      currentSeason: null,
      country: null,
      logo: "https://assets.sheepesports.com/lck.png",
    },
  ]);
});
