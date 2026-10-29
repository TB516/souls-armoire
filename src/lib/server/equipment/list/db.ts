import { asc, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import type { GameId } from "#lib/games.ts";
import { Database } from "#lib/server/db/effect.ts";
import { equipment } from "#lib/server/db/schema/equipment.ts";
import { outfitPositionSlot, type OutfitEquipment } from "#lib/server/db/schema/outfit.ts";

/** Read catalog names, IDs, and the outfit positions each item fits, for equipment pickers. */
export const getEquipmentCatalog = Effect.fn("getEquipmentCatalog")(function* ({
  gameId,
}: {
  readonly gameId: GameId;
}) {
  const db = yield* Database;

  return yield* db
    .select({
      id: equipment.id,
      name: equipment.name,
      // Cast to text[]: the driver parses text arrays but not arrays of custom enums.
      positions: sql<
        OutfitEquipment["position"][]
      >`array_agg(${outfitPositionSlot.position}::text order by ${outfitPositionSlot.position})`,
    })
    .from(equipment)
    .innerJoin(outfitPositionSlot, eq(outfitPositionSlot.slot, equipment.slot))
    .where(eq(equipment.gameId, gameId))
    .groupBy(equipment.gameId, equipment.id)
    .orderBy(asc(equipment.name), asc(equipment.id));
});
