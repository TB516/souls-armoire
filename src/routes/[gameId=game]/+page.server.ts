import { error } from "@sveltejs/kit";
import { Option, Schema } from "effect";
import { outfitTitleMaxLength } from "#lib/outfits.ts";
import { outfitEquipmentPosition, type OutfitEquipment } from "#lib/server/db/schema/outfit.ts";
import { outfitSortOrders, type ListOutfitsInput } from "#lib/server/outfits/list/db.ts";
import { listOutfits } from "#lib/server/outfits/list/index.ts";
import { serverRuntime } from "#lib/server/runtime.ts";
import type { PageServerLoad } from "./$types";

const equipmentId = Schema.optionalKey(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64)),
);

const collectionFiltersSchema = Schema.Struct({
  page: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10_000 })),
  // Searches match titles, so they share the title limit.
  search: Schema.String.check(Schema.isMaxLength(outfitTitleMaxLength)),
  sort: Schema.Literals(outfitSortOrders),
  equipment: Schema.Struct({
    head: equipmentId,
    chest: equipmentId,
    arms: equipmentId,
    legs: equipmentId,
    "left-hand": equipmentId,
    "right-hand": equipmentId,
  } satisfies Record<OutfitEquipment["position"], typeof equipmentId>),
});

/** Validate URL filters and load the collection's matching outfits. */
export const load = (async ({ params, url }) => {
  const searchParams = url.searchParams;
  const equipment: ListOutfitsInput["equipment"] = {};

  for (const position of outfitEquipmentPosition.enumValues) {
    const id = searchParams.get(position);
    if (id) equipment[position] = id;
  }

  const decodedFilters = Schema.decodeUnknownOption(collectionFiltersSchema)({
    page: Number(searchParams.get("page") ?? "1"),
    search: (searchParams.get("search") ?? "").trim(),
    sort: searchParams.get("sort") ?? "newest",
    equipment,
  });

  if (Option.isNone(decodedFilters)) {
    error(400, "Invalid collection filters");
  }

  const filters = decodedFilters.value;
  const gallery = await serverRuntime.runPromise(
    listOutfits({ gameId: params.gameId, ...filters }),
  );

  return { filters, gallery };
}) satisfies PageServerLoad;
