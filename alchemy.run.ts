import * as Cloudflare from "@alchemy.run/cloudflare";
import { LOCAL_R2_S3_CREDENTIALS, LOCAL_R2_S3_PATH } from "@alchemy.run/cloudflare/R2/LocalS3";
import * as Docker from "@alchemy.run/docker";
import * as Alchemy from "alchemy";
import * as Command from "alchemy/Command";
import * as Output from "alchemy/Output";
import { Effect, Layer } from "effect";

export default Alchemy.Stack(
  "souls-armoire",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), Docker.providers(), Command.providers()),
    state: Alchemy.localState(),
  },
  Effect.gen(function* () {
    const { dev } = yield* Alchemy.AlchemyContext;

    if (!dev) {
      return yield* Effect.die(new Error("This stack is for local development. Run pnpm dev."));
    }

    const image = yield* Docker.RemoteImage("PostgresImage", {
      name: "postgres",
      tag: "18-alpine",
      alwaysPull: false,
    });
    const data = yield* Docker.Volume("PostgresData", { name: "souls-armoire-postgres-data" });
    const postgres = yield* Docker.Container("Postgres", {
      name: "souls-armoire-postgres",
      image,
      environment: {
        POSTGRES_USER: "armoire",
        POSTGRES_PASSWORD: "armoire",
        POSTGRES_DB: "armoire",
      },
      ports: [{ external: "127.0.0.1:5432", internal: 5432 }],
      volumes: [{ hostPath: data.name, containerPath: "/var/lib/postgresql" }],
      healthcheck: {
        cmd: ["CMD", "pg_isready", "-U", "armoire", "-d", "armoire"],
        interval: "1 second",
      },
      start: true,
    });

    const bucket = yield* Cloudflare.R2.Bucket("Objects", { name: "souls-armoire-objects" });
    // This worker only hosts Alchemy's local S3 endpoint. The app runs in Node.
    const storage = yield* Cloudflare.Worker("ObjectStorage", {
      name: "souls-armoire-r2-local",
      script: "export default { fetch() { return new Response(null, { status: 404 }); } };",
      env: { OBJECTS: bucket },
      dev: { host: "127.0.0.1" },
    });

    const app = yield* Command.Dev("App", {
      command: "pnpm exec vite dev",
      env: {
        DATABASE_URL: postgres.ports.pipe(
          Output.map(
            (ports) => `postgresql://armoire:armoire@127.0.0.1:${ports["5432/tcp"]}/armoire`,
          ),
        ),
        R2_BUCKET_NAME: bucket.bucketName,
        R2_ENDPOINT: storage.url.pipe(Output.map((url) => `${url}${LOCAL_R2_S3_PATH}`)),
        R2_REGION: "auto",
        R2_ACCESS_KEY_ID: LOCAL_R2_S3_CREDENTIALS.accessKeyId,
        R2_SECRET_ACCESS_KEY: LOCAL_R2_S3_CREDENTIALS.secretAccessKey,
      },
    });

    return { url: app.url };
  }),
);
