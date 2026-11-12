import assert from "node:assert/strict";
import test from "node:test";
import { scrapeWithFlareSolverr } from "../src/helper/httpRequests.js";

test("requires a FlareSolverr URL", async () => {
  const previousUrl = process.env.FLARESOLVERR_URL;
  delete process.env.FLARESOLVERR_URL;

  try {
    await assert.rejects(
      scrapeWithFlareSolverr("https://provider.test/page"),
      /FLARESOLVERR_URL must be set/,
    );
  } finally {
    if (previousUrl === undefined) {
      delete process.env.FLARESOLVERR_URL;
    } else {
      process.env.FLARESOLVERR_URL = previousUrl;
    }
  }
});
