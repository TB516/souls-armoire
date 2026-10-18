# Development

The development environment uses Docker and `.devcontainer/devcontainer.json`.
Open it with a devcontainer-compatible editor or tool to start the app container,
PostgreSQL, and RustFS. The devcontainer installs dependencies, applies migrations
on startup, and exposes ports 5173, 9000, and 9001. Create `.env` from `.env.example`
and fill in the auth settings before starting the app.

VS Code supports **Dev Containers: Reopen in Container**, and Zed supports
**Open in Container**. Neither editor is required. Their extension recommendations
are in the devcontainer configuration; Zed's project settings are in
`.zed/settings.json`.

Vite listens on `0.0.0.0` inside the container so Docker-published ports can reach
it. Access the ports through your devcontainer tool's forwarding or publishing.

Once the container is ready, run inside it:

```sh
pnpm dev
```

Open <http://localhost:5173>. Run `pnpm db:setup` if you want sample outfits.
Neither startup nor `pnpm dev` seeds them.

## Commands

| Command             | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Start the SvelteKit development server with HMR.      |
| `pnpm build`        | Build the standalone Node server.                     |
| `pnpm start`        | Run a previously built server.                        |
| `pnpm check`        | Check TypeScript and Svelte code.                     |
| `pnpm lint`         | Lint JavaScript and TypeScript with Oxlint.           |
| `pnpm format`       | Format the project with Oxfmt.                        |
| `pnpm format:check` | Check formatting without changing files.              |
| `pnpm db:generate`  | Generate migrations from the Drizzle schema.          |
| `pnpm db:migrate`   | Apply pending migrations to the development database. |
| `pnpm db:seed`      | Upload sample images and insert sample database rows. |
| `pnpm db:setup`     | Apply migrations, then seed development data.         |

The Drizzle schema lives under `src/lib/server/db/schema`. Application queries use
the Effect-native Drizzle driver. `src/lib/server/runtime.ts` provides the database,
storage, and query caches to SvelteKit's server loads and remote functions. Better
Auth uses its own database adapter.

Server operations live under their domain, such as `outfits/list` or
`equipment/list`. Operations keep database queries in `db.ts` and the public
operation in `index.ts`. Outfit operations define their caches in `cache.ts`.
Remote functions validate inputs and run those operations through `serverRuntime`.
The collection's server load validates URL filters and calls the operations directly.
Outfit details use a server load that validates the outfit ID and calls the get operation.

The UI uses Tailwind through Vite. Shared colors, typography, and page spacing
live in `src/app.css`; reusable components live in `src/lib/components`. Component
props infer their data types from backend operations or remote functions. Oxfmt
sorts Tailwind classes, and Zed uses its Tailwind-aware CSS language server for
the theme file.

Collection pages support title search, equipment filters, and newest/oldest sorting.
Filters and pagination live in the URL, including when opening an outfit and returning
to the collection. Equipment links open outfits using that piece in the same position.
The collection's server load validates URL filters and fetches matching outfits
through the list cache. Title searches use the `search` URL parameter.
Equipment choices come from a prerendered remote function, separate from the
collection load response. Equipment pickers use Bits UI, filter choices locally,
and show equipment icons. Only Apply filters submits the selected IDs.
Builds need a migrated database containing the equipment catalog. Catalog changes
require a rebuild; in development, the remote function reads the database directly.
Screenshots show the full image and open in a Bits UI dialog.

## Local object storage

RustFS holds outfit images in the persistent `rustfs-data` volume. A one-shot
`storage-init` service creates the private `outfit-images` bucket. Its successful
exit is expected. Equipment icons remain under `static/`.

Open the RustFS console at <http://localhost:9001> with access key `armoire-dev`
and secret key `armoire-local-development-only`. These credentials are for local
development only.

RustFS shares the app container's network namespace. Its API is
`http://localhost:9000` inside the container and through forwarded or published ports,
so signed image URLs work in the browser. Port 9000 must be free locally. PostgreSQL
is at `db:5432` inside the Compose network. Rebuild with your devcontainer tool after
changing the configuration, rather than starting another Compose stack.

## Required runtime environment

`src/lib/server/storage/effect.ts` provides `ObjectStorage` through the AWS S3 SDK.
It uploads and deletes objects and signs direct download URLs valid for one hour.
The app does not proxy image bytes. URL signing does not check that an object exists;
uploads overwrite an existing key, and deleting a missing key succeeds.

`serverRuntime` supplies this storage service to the outfit queries. Successful
list pages stay cached for 30 seconds and existing outfit details for five minutes;
missing outfits and database failures are retried. Each request signs fresh image
URLs. The cache is in memory per server process. Uploads and image validation are
still to be built.

`S3_ENDPOINT` must be reachable by both the server and browser. Do not rewrite
signed URLs, since the hostname is part of the signature.

`src/env.ts` validates these private variables. Compose supplies the database and
S3 values locally; `.env` supplies auth values. A deployment must supply all of
them:

| Variable                | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection URL.                                     |
| `S3_ENDPOINT`           | Object storage API endpoint.                                   |
| `S3_REGION`             | Region expected by the storage provider.                       |
| `S3_BUCKET`             | Bucket containing outfit images.                               |
| `S3_ACCESS_KEY_ID`      | Storage access key.                                            |
| `S3_SECRET_ACCESS_KEY`  | Storage secret key.                                            |
| `S3_FORCE_PATH_STYLE`   | `true` for path-style URLs or `false` for virtual-hosted URLs. |
| `BETTER_AUTH_URL`       | Public application URL.                                        |
| `BETTER_AUTH_SECRET`    | Authentication signing secret.                                 |
| `DISCORD_CLIENT_ID`     | Discord OAuth application ID.                                  |
| `DISCORD_CLIENT_SECRET` | Discord OAuth application secret.                              |

## Development data

Run `pnpm db:setup` inside the devcontainer to apply migrations and seed sample
data. The seed uploads seven WebP placeholders, then inserts two fictional authors
and three outfits. Sample authors have no login accounts. Data and image roles are
defined in `fixtures/outfits.ts`; the image files are under `fixtures/outfits/`.

The seed uses stable IDs and reserved `dev/outfits/` storage keys, so rerunning it
repairs missing fixtures without deleting unrelated data. Database inserts run in
one transaction, but storage uploads cannot roll back with it. A failed run may
leave uploaded fixtures; rerun the seed to complete it. The script refuses to run
with `NODE_ENV=production`. Run it only against a development database.
