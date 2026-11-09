import { and, count, eq, gt, inArray, sql } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import { Effect } from "effect";
import type { SqlError } from "effect/sql/SqlError";
import type { GameId } from "#lib/games.ts";
import { Database } from "#lib/server/db/effect.ts";
import { user } from "#lib/server/db/schema/auth.ts";
import { equipment } from "#lib/server/db/schema/equipment.ts";
import {
  outfit,
  outfitEquipment,
  outfitImage,
  type OutfitEquipment,
  type OutfitImage,
} from "#lib/server/db/schema/outfit.ts";
import { PublicationLimitReached } from "./errors.ts";

/** Successful publications allowed per account in any rolling 24 hours. */
export const publicationLimit = 10;

/** Count the author's outfits created in the last 24 hours. */
const countRecentPublications = (db: Pick<EffectPgDatabase, "select">, authorId: string) =>
  db
    .select({ publications: count() })
    .from(outfit)
    .where(
      and(eq(outfit.authorId, authorId), gt(outfit.createdAt, sql`now() - interval '24 hours'`)),
    )
    .pipe(Effect.map(([row]) => row?.publications ?? 0));

/** Check the limit without locking, so limited authors can be rejected before uploading. */
export const hasReachedPublicationLimit = Effect.fn("hasReachedPublicationLimit")(function* (
  authorId: string,
) {
  const db = yield* Database;
  const publications = yield* countRecentPublications(db, authorId);

  return publications >= publicationLimit;
});

/** Read the catalog slots of the given equipment IDs within one game. */
export const getEquipmentSlots = Effect.fn("getEquipmentSlots")(function* ({
  gameId,
  equipmentIds,
}: {
  readonly gameId: GameId;
  readonly equipmentIds: readonly string[];
}) {
  if (equipmentIds.length === 0) return [];

  const db = yield* Database;

  return yield* db
    .select({ id: equipment.id, slot: equipment.slot })
    .from(equipment)
    .where(and(eq(equipment.gameId, gameId), inArray(equipment.id, [...equipmentIds])));
});

/** The rows that make up one published outfit. */
export type InsertOutfitInput = {
  readonly outfit: typeof outfit.$inferInsert & { readonly id: string };
  readonly equipment: readonly Omit<OutfitEquipment, "outfitId" | "gameId">[];
  readonly images: readonly Omit<OutfitImage, "outfitId">[];
};

/** Insert an outfit with its equipment and images, enforcing the publication limit. */
export const insertOutfit = Effect.fn("insertOutfit")(function* (input: InsertOutfitInput) {
  const db = yield* Database;
  const { id: outfitId, gameId, authorId } = input.outfit;

  // Drizzle's transaction type imports SqlError from Effect's pre-4.0 path, so its error
  // channel resolves to `any`. Restate it to keep the limit error typed for callers.
  const transaction: Effect.Effect<
    void,
    PublicationLimitReached | EffectDrizzleQueryError | SqlError
  > = db.transaction((tx) =>
    Effect.gen(function* () {
      // Lock the author so concurrent submissions count their publications one at a time.
      yield* tx.select({ id: user.id }).from(user).where(eq(user.id, authorId)).for("update");

      const publications = yield* countRecentPublications(tx, authorId);
      if (publications >= publicationLimit) {
        return yield* new PublicationLimitReached();
      }

      yield* tx.insert(outfit).values(input.outfit);
      if (input.equipment.length > 0) {
        yield* tx
          .insert(outfitEquipment)
          .values(input.equipment.map((selection) => ({ ...selection, outfitId, gameId })));
      }
      yield* tx.insert(outfitImage).values(input.images.map((image) => ({ ...image, outfitId })));
    }),
  );

  yield* transaction;
});
