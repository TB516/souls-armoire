import { Effect } from "effect";
import { ObjectStorage } from "#lib/server/storage/effect.ts";
import { OutfitCache } from "./cache.ts";
import type { GetOutfitInput } from "./db.ts";

/** Read an outfit and sign fresh URLs for its screenshots. */
export const getOutfit = Effect.fn("getOutfit")(function* (input: GetOutfitInput) {
  const cache = yield* OutfitCache;
  const storage = yield* ObjectStorage;
  const outfitDetails = yield* cache.get(input);

  if (!outfitDetails) return null;

  const images = yield* Effect.all(
    outfitDetails.imageSelections.map(({ role, storageKey }) =>
      storage.getUrl(storageKey).pipe(Effect.map((url) => ({ role, url }))),
    ),
    { concurrency: 3 },
  );

  return {
    ...outfitDetails.outfitSelection,
    equipmentPieces: outfitDetails.equipmentPieces,
    images,
  };
});
