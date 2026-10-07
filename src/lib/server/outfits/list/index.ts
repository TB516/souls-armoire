import { Effect } from "effect";
import { ObjectStorage } from "#lib/server/storage/effect.ts";
import { OutfitListCache } from "./cache.ts";
import type { ListOutfitsInput } from "./db.ts";

/** Read a filtered page of published outfits with direct thumbnail URLs. */
export const listOutfits = Effect.fn("listOutfits")(function* (input: ListOutfitsInput) {
  const cache = yield* OutfitListCache;
  const storage = yield* ObjectStorage;
  const { outfitSelections, hasNextPage } = yield* cache.get(input);

  const outfits = yield* Effect.all(
    outfitSelections.map(({ thumbnailKey, ...outfitSelection }) =>
      storage
        .getUrl(thumbnailKey)
        .pipe(Effect.map((thumbnailUrl) => ({ ...outfitSelection, thumbnailUrl }))),
    ),
    { concurrency: 8 },
  );

  return { outfits, hasNextPage };
});
