import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  ProviderClient,
  ProviderHttpError,
} from "../src/providers/client.js";

test("spaces concurrent requests to the same provider", async () => {
  const requestTimes: number[] = [];
  const client = new ProviderClient("test", {
    minIntervalMs: 30,
    fetchImpl: async () => {
      requestTimes.push(performance.now());
      return new Response("ok");
    },
  });

  await Promise.all([
    client.get("https://provider.test/a"),
    client.get("https://provider.test/b"),
    client.get("https://provider.test/c"),
  ]);

  assert.equal(requestTimes.length, 3);
  assert.ok(requestTimes[1] - requestTimes[0] >= 25);
  assert.ok(requestTimes[2] - requestTimes[1] >= 25);
});

test("retries rate-limited responses", async () => {
  let attempts = 0;
  const client = new ProviderClient("test", {
    minIntervalMs: 1,
    fetchImpl: async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("slow down", { status: 429, headers: { "retry-after": "0" } })
        : new Response("ok");
    },
  });

  const body = await client.get("https://provider.test/data");
  assert.equal(body, "ok");
  assert.equal(attempts, 2);
});

test("does not retry non-transient client errors", async () => {
  let attempts = 0;
  const client = new ProviderClient("test", {
    minIntervalMs: 1,
    fetchImpl: async () => {
      attempts += 1;
      return new Response("not found", { status: 404 });
    },
  });

  await assert.rejects(client.get("https://provider.test/missing"), ProviderHttpError);
  assert.equal(attempts, 1);
});

test("aborts requests that exceed the configured timeout", async () => {
  const client = new ProviderClient("test", {
    minIntervalMs: 1,
    timeoutMs: 10,
    maxAttempts: 1,
    fetchImpl: async (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
  });

  await assert.rejects(client.get("https://provider.test/slow"), /timed out/);
});

test("keeps the timeout active while reading the response body", async () => {
  const client = new ProviderClient("test", {
    minIntervalMs: 1,
    timeoutMs: 10,
    maxAttempts: 1,
    fetchImpl: async (_input, init) =>
      new Response(
        new ReadableStream({
          start(controller) {
            init?.signal?.addEventListener("abort", () => controller.error(new Error("aborted")), {
              once: true,
            });
          },
        }),
      ),
  });

  await assert.rejects(client.get("https://provider.test/slow-body"), /timed out/);
});

test("stops after the configured number of attempts", async () => {
  let attempts = 0;
  const client = new ProviderClient("test", {
    minIntervalMs: 1,
    maxAttempts: 2,
    fetchImpl: async () => {
      attempts += 1;
      return new Response("slow down", { status: 429 });
    },
  });

  await assert.rejects(client.get("https://provider.test/rate-limited"), ProviderHttpError);
  assert.equal(attempts, 2);
});
