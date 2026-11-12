import assert from "node:assert/strict";
import test from "node:test";
import { mergeLeaguepediaLeagues } from "../src/providers/leaguepedia/merge.js";
import type { League } from "../src/providers/interface.js";

const league = (overrides: Partial<League>): League => ({
  id: "1",
  league: "LEC",
  leagueShort: null,
  sport: "League of Legends",
  division: null,
  cupId: null,
  currentSeason: null,
  country: null,
  logo: null,
  ...overrides,
});

test("enriches matching leagues without adding provider-only records", () => {
  const fullName = "League of Legends EMEA Championship";
  const existing = [
    league({ id: "1", league: fullName, leagueShort: "LEC" }),
    league({ id: "2", league: "LEC" }),
    league({ id: "3", league: "LCS", leagueShort: "LCS" }),
  ];

  const merged = mergeLeaguepediaLeagues(existing, [
    league({
      id: "LEC",
      league: fullName,
      leagueShort: "LEC",
    }),
    league({ id: "LCK", league: "LCK", leagueShort: "LCK" }),
  ]);

  assert.deepEqual(merged.map(({ id, league: name, leagueShort }) => ({ id, name, leagueShort })), [
    { id: "3", name: "LCS", leagueShort: "LCS" },
    { id: "1", name: fullName, leagueShort: "LEC" },
  ]);
});

test("replaces an acronym-only display name with Leaguepedia's full name", () => {
  const merged = mergeLeaguepediaLeagues(
    [league({ id: "1", league: "LEC" })],
    [league({
      id: "LEC",
      league: "League of Legends EMEA Championship",
      leagueShort: "LEC",
    })],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].league, "League of Legends EMEA Championship");
  assert.equal(merged[0].leagueShort, "LEC");
});
