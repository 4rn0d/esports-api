export interface ProviderClientOptions {
  minIntervalMs?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
}

export class ProviderHttpError extends Error {
  constructor(
    public readonly providerId: string,
    public readonly status: number,
  ) {
    super(`Provider "${providerId}" returned HTTP ${status}`);
    this.name = "ProviderHttpError";
  }
}

export class ProviderClient {
  private readonly minIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private queue: Promise<void> = Promise.resolve();
  private nextRequestAt = 0;

  constructor(
    public readonly providerId: string,
    options: ProviderClientOptions = {},
  ) {
    this.minIntervalMs = options.minIntervalMs ?? setting("PROVIDER_MIN_INTERVAL_MS", 2000);
    this.timeoutMs = options.timeoutMs ?? setting("PROVIDER_TIMEOUT_MS", 15000);
    this.maxAttempts = options.maxAttempts ?? setting("PROVIDER_MAX_ATTEMPTS", 3);
    this.fetchImpl = options.fetchImpl ?? fetch;
    if (!providerId.trim()) throw new Error("providerId must not be empty");
    if (![this.minIntervalMs, this.timeoutMs, this.maxAttempts].every(Number.isInteger)) {
      throw new Error("Provider limits must be integers");
    }
    if (this.minIntervalMs < 1 || this.timeoutMs < 1 || this.maxAttempts < 1) {
      throw new Error("Provider limits must be positive");
    }
  }

  get(url: string | URL, init: Omit<RequestInit, "method" | "signal"> = {}): Promise<string> {
    const request = this.queue.then(() => this.request(url, init));
    this.queue = request.then(() => undefined, () => undefined);
    return request;
  }

  private async request(
    url: string | URL,
    init: Omit<RequestInit, "method" | "signal">,
  ): Promise<string> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const waitMs = this.nextRequestAt - Date.now();
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.nextRequestAt = Date.now() + this.minIntervalMs;

      const controller = new AbortController();
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeoutMs);

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          ...init,
          method: "GET",
          signal: controller.signal,
        });
        if (response.ok) {
          const body = await response.text();
          clearTimeout(timeout);
          return body;
        }
      } catch (error) {
        clearTimeout(timeout);
        if (attempt === this.maxAttempts) {
          throw new Error(
            timedOut
              ? `Provider "${this.providerId}" timed out`
              : `Request to provider "${this.providerId}" failed`,
            { cause: error },
          );
        }
        await this.backoff(attempt, null);
        continue;
      }
      clearTimeout(timeout);

      if (!this.isRetryable(response.status) || attempt === this.maxAttempts) {
        throw new ProviderHttpError(this.providerId, response.status);
      }

      await this.backoff(attempt, response.headers.get("retry-after"));
    }

    throw new Error(`Request to provider "${this.providerId}" failed after ${this.maxAttempts} attempts`);
  }

  private isRetryable(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
  }

  private async backoff(attempt: number, retryAfter: string | null): Promise<void> {
    const seconds = Number(retryAfter);
    const retryDate = retryAfter ? Date.parse(retryAfter) : NaN;
    const retryAfterMs = Number.isFinite(seconds)
      ? Math.max(0, seconds * 1000)
      : Number.isNaN(retryDate)
        ? 0
        : Math.max(0, retryDate - Date.now());
    const backoffMs = 500 * 2 ** (attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfterMs, backoffMs)));
  }
}

const clients = new Map<string, ProviderClient>();

export function getProviderClient(providerId: string): ProviderClient {
  const key = providerId.toLowerCase();
  let client = clients.get(key);
  if (!client) {
    client = new ProviderClient(providerId);
    clients.set(key, client);
  }
  return client;
}

function setting(name: string, fallback: number): number {
  const value = process.env[name];
  return value === undefined ? fallback : Number(value);
}
