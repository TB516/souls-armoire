import { Cache, Context, Effect, Exit, Layer } from "effect";
import { getOutfitPage, type ListOutfitsInput } from "./db.ts";

/** Cached gallery pages, without signed thumbnail URLs. */
export class OutfitListCache extends Context.Service<
  OutfitListCache,
  {
    get: (input: ListOutfitsInput) => ReturnType<typeof getOutfitPage>;
    /** Drop every cached page, since a new outfit can shift any page's contents. */
    invalidateAll: Effect.Effect<void>;
  }
>()("OutfitListCache") {}

/** Retain gallery pages for thirty seconds; retry database failures immediately. */
export const outfitListCacheLayer = Layer.effect(
  OutfitListCache,
  Effect.gen(function* () {
    const cache = yield* Cache.makeWith(getOutfitPage, {
      capacity: 100,
      requireServicesAt: "lookup",
      timeToLive: (exit) => (Exit.isSuccess(exit) ? "30 seconds" : 0),
    });

    return OutfitListCache.of({
      get: (input) => Cache.get(cache, input),
      invalidateAll: Cache.invalidateAll(cache),
    });
  }),
);
