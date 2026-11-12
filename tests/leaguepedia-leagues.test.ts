import assert from "node:assert/strict";
import test from "node:test";
import {
  parseLeaguePages,
  parseLeagueShortNames,
} from "../src/providers/leaguepedia/leagues.js";

test("parses and deduplicates Leaguepedia short names", () => {
  assert.deepEqual(
    parseLeagueShortNames(JSON.stringify({
      cargoquery: [
        { title: { League: "LCK" } },
        { title: { League: "LCK" } },
        { title: { League: "  LEC " } },
        { title: { League: null } },
      ],
    })),
    ["LCK", "LEC"],
  );
});

test("resolves full league names from Leaguepedia's league pages", () => {
  const body = JSON.stringify({
    query: {
      pages: [
        {
          revisions: [{
            slots: {
              main: {
                content: "{{LeagueGroupOverview|\n|long=LoL EMEA Championship\n|short=LEC\n}}",
              },
            },
          }],
        },
      ],
    },
  });

  assert.deepEqual(
    parseLeaguePages(body, ["LEC"]),
    [{
      id: "LEC",
      sport: "League of Legends",
      league: "League of Legends EMEA Championship",
      leagueShort: "LEC",
      division: null,
      cupId: null,
      currentSeason: null,
      country: null,
      logo: null,
    }],
  );
});

test("rejects malformed Leaguepedia responses", () => {
  assert.throws(() => parseLeagueShortNames(JSON.stringify({ error: "API error" })), /invalid league list/);
  assert.throws(() => parseLeaguePages(JSON.stringify({ error: "API error" }), ["LEC"]), /invalid league detail response/);
});
