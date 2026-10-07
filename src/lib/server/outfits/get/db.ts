import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { GameId } from "#lib/games.ts";
import { Database } from "#lib/server/db/effect.ts";
import { user } from "#lib/server/db/schema/auth.ts";
import { equipment } from "#lib/server/db/schema/equipment.ts";
import { outfit, outfitEquipment, outfitImage } from "#lib/server/db/schema/outfit.ts";

/** Identifies an outfit within a supported game. */
export type GetOutfitInput = { readonly gameId: GameId; readonly outfitId: string };

/** Read the outfit, equipment, and image keys from the database. */
export const getOutfitDetails = Effect.fn("getOutfitDetails")(function* ({
  gameId,
  outfitId,
}: GetOutfitInput) {
  const db = yield* Database;

  const [outfitSelection] = yield* db
    .select({
      id: outfit.id,
      title: outfit.title,
      description: outfit.description,
      createdAt: outfit.createdAt,
      authorName: user.name,
    })
    .from(outfit)
    .innerJoin(user, eq(outfit.authorId, user.id))
    .where(and(eq(outfit.gameId, gameId), eq(outfit.id, outfitId)))
    .limit(1);

  if (!outfitSelection) return null;

  const [equipmentPieces, imageSelections] = yield* Effect.all([
    db
      .select({
        position: outfitEquipment.position,
        id: equipment.id,
        name: equipment.name,
        slot: equipment.slot,
        category: equipment.category,
        source: equipment.source,
      })
      .from(outfitEquipment)
      .innerJoin(
        equipment,
        and(
          eq(outfitEquipment.gameId, equipment.gameId),
          eq(outfitEquipment.equipmentId, equipment.id),
        ),
      )
      .where(eq(outfitEquipment.outfitId, outfitId)),
    db
      .select({ role: outfitImage.role, storageKey: outfitImage.storageKey })
      .from(outfitImage)
      .where(eq(outfitImage.outfitId, outfitId)),
  ]);

  return { outfitSelection, equipmentPieces, imageSelections };
});
