import { and, asc, desc, eq, exists, ilike } from "drizzle-orm";
import { Effect } from "effect";
import type { GameId } from "#lib/games.ts";
import { Database } from "#lib/server/db/effect.ts";
import { user } from "#lib/server/db/schema/auth.ts";
import {
  outfit,
  outfitEquipment,
  outfitEquipmentPosition,
  outfitImage,
  type OutfitEquipment,
} from "#lib/server/db/schema/outfit.ts";

const galleryPageSize = 18;

/** Filters and pagination for a game's outfit collection. */
export type ListOutfitsInput = {
  readonly gameId: GameId;
  readonly page: number;
  readonly search: string;
  readonly sort: "newest" | "oldest";
  readonly equipment: Partial<Record<OutfitEquipment["position"], OutfitEquipment["equipmentId"]>>;
};

/** Read one page of outfit previews and its next-page flag from the database. */
export const getOutfitPage = Effect.fn("getOutfitPage")(function* ({
  gameId,
  page,
  search,
  sort,
  equipment,
}: ListOutfitsInput) {
  const db = yield* Database;
  const conditions = [eq(outfit.gameId, gameId)];

  if (search) {
    // Search literal text, not user-supplied SQL wildcard patterns.
    const escapedSearch = search.replace(/[\\%_]/g, "\\$&");
    conditions.push(ilike(outfit.title, `%${escapedSearch}%`));
  }

  for (const position of outfitEquipmentPosition.enumValues) {
    const equipmentId = equipment[position];
    if (!equipmentId) continue;

    // Each filter must match its own position without multiplying outfit rows.
    conditions.push(
      exists(
        db
          .select({ outfitId: outfitEquipment.outfitId })
          .from(outfitEquipment)
          .where(
            and(
              eq(outfitEquipment.outfitId, outfit.id),
              eq(outfitEquipment.position, position),
              eq(outfitEquipment.equipmentId, equipmentId),
            ),
          ),
      ),
    );
  }

  const order = sort === "oldest" ? asc : desc;

  const outfitSelections = yield* db
    .select({
      id: outfit.id,
      title: outfit.title,
      createdAt: outfit.createdAt,
      authorName: user.name,
      thumbnailKey: outfitImage.storageKey,
    })
    .from(outfit)
    .innerJoin(user, eq(outfit.authorId, user.id))
    .innerJoin(
      outfitImage,
      and(eq(outfitImage.outfitId, outfit.id), eq(outfitImage.role, "portrait-1")),
    )
    .where(and(...conditions))
    .orderBy(order(outfit.createdAt), order(outfit.id))
    .limit(galleryPageSize + 1)
    .offset((page - 1) * galleryPageSize);

  return {
    outfitSelections: outfitSelections.slice(0, galleryPageSize),
    hasNextPage: outfitSelections.length > galleryPageSize,
  };
});
