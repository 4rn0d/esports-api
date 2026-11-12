# esports-api

## Local development

For local PostgreSQL in Docker, copy `.env.example` to `.env`, then run
`docker compose up --build`. The API listens on `http://localhost:3000`.

To run the API locally against a hosted PostgreSQL database:

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to the connection string
   from your database provider. Keep the URL private; `.env` is gitignored.
2. Run the SQL in `db/init.sql` once using the provider's SQL editor.
3. Run `npm run dev`. The server loads `.env`; `GET /health` checks the database
   connection.

## Deploy with Komodo

The GitHub Actions workflow publishes `ghcr.io/4rn0d/esports-api:latest` on
pushes to `main` and version tags. Push the workflow to GitHub and wait for its
first successful run before deploying.

Create a Komodo Stack from this repository using `docker-compose.yaml`. Add
`POSTGRES_DB` (`esports`), `POSTGRES_USER` (`esports`), and a strong,
URL-independent `POSTGRES_PASSWORD` as Stack environment variables or secrets.
The API is published on port `3123`; PostgreSQL stays private to the Stack
network. The named `postgres_data` volume persists the database, and
`db/init.sql` runs automatically the first time that volume is initialized.

GHCR packages are private by default. To let Komodo pull without registry
credentials, change the package visibility to public after the first workflow
run; otherwise configure Komodo with a GitHub username and a token that has
`read:packages` access.

`GET /teams` returns `{ "teams": [...] }`; `GET /leagues` returns
`{ "leagues": [...] }`. Response properties use plain names (`id`, `team`,
`sport`, `country`) rather than TheSportsDB's type-prefixed names. Translation
fields are omitted.

The provider client in `src/providers/client.ts` is the shared outbound HTTP entry
point for source adapters. `getProviderClient("sheep")` returns one process-wide
client per provider. By default it serializes requests, spaces them by 2 seconds,
times each request out after 15 seconds, and makes at most three total attempts
for 429, server errors, or network failures. `Retry-After` is respected.

Set `PROVIDER_MIN_INTERVAL_MS`, `PROVIDER_TIMEOUT_MS`, and
`PROVIDER_MAX_ATTEMPTS` to change the defaults. Check each source's published
terms and limits before setting these values. The limiter is per process, so it
does not coordinate requests across multiple API replicas. Rate limiting reduces
load but cannot guarantee a provider will never time out or block an IP.