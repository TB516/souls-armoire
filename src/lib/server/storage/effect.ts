import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Context, Effect, Layer } from "effect";
import { StorageError } from "./errors.ts";

/** Connection settings for an S3-compatible bucket. */
export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

/** Image bytes and media type supplied when uploading an object. */
export interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

/** Object operations scoped to one bucket. Keys are storage paths, not public URLs. */
export class ObjectStorage extends Context.Service<
  ObjectStorage,
  {
    /** Upload bytes with their media type. An existing key is overwritten. */
    put: (key: string, object: StoredObject) => Effect.Effect<void, StorageError>;
    /** Sign a direct download URL valid for one hour. Does not check existence or cache URLs. */
    getUrl: (key: string) => Effect.Effect<string, StorageError>;
    /** Delete an object. An already absent key is considered success. */
    delete: (key: string) => Effect.Effect<void, StorageError>;
  }
>()("ObjectStorage") {}

/** Owns the S3 client and closes its connections when the consuming scope ends. */
export const storageLayer = (config: StorageConfig) =>
  Layer.effect(
    ObjectStorage,
    Effect.gen(function* () {
      const client = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new S3Client({
              endpoint: config.endpoint,
              region: config.region,
              forcePathStyle: config.forcePathStyle,
              credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
              },
            }),
        ),
        (client) => Effect.sync(() => client.destroy()),
      );

      return ObjectStorage.of({
        put: Effect.fn("ObjectStorage.put")((key: string, object: StoredObject) =>
          Effect.tryPromise({
            try: async (signal) => {
              await client.send(
                new PutObjectCommand({
                  Bucket: config.bucket,
                  Key: key,
                  Body: object.body,
                  ContentType: object.contentType,
                }),
                { abortSignal: signal },
              );
            },
            catch: (cause) => new StorageError({ operation: "put", key, cause }),
          }),
        ),
        getUrl: Effect.fn("ObjectStorage.getUrl")((key: string) =>
          Effect.tryPromise({
            // Signing is local and has no abort API. Effect can interrupt the wait,
            // but cannot stop the underlying signing work once it has started.
            try: () =>
              getSignedUrl(
                client,
                new GetObjectCommand({
                  Bucket: config.bucket,
                  Key: key,
                }),
                { expiresIn: 3600 },
              ),
            catch: (cause) => new StorageError({ operation: "getUrl", key, cause }),
          }),
        ),
        delete: Effect.fn("ObjectStorage.delete")((key: string) =>
          Effect.tryPromise({
            try: async (signal) => {
              await client.send(
                new DeleteObjectCommand({
                  Bucket: config.bucket,
                  Key: key,
                }),
                { abortSignal: signal },
              );
            },
            catch: (cause) => new StorageError({ operation: "delete", key, cause }),
          }),
        ),
      });
    }),
  );
