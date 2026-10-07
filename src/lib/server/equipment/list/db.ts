import { asc, eq } from "drizzle-orm";
import { Effect } from "effect";
import type { GameId } from "#lib/games.ts";
import { Database } from "#lib/server/db/effect.ts";
import { equipment } from "#lib/server/db/schema/equipment.ts";

/** Read catalog names, IDs, and slots used by the equipment picker. */
export const getEquipmentCatalog = Effect.fn("getEquipmentCatalog")(function* ({
  gameId,
}: {
  readonly gameId: GameId;
}) {
  const db = yield* Database;

  return yield* db
    .select({ id: equipment.id, name: equipment.name, slot: equipment.slot })
    .from(equipment)
    .where(eq(equipment.gameId, gameId))
    .orderBy(asc(equipment.name), asc(equipment.id));
});
