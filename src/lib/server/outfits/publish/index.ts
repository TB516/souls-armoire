import { imageSize } from "image-size";
import { Effect } from "effect";
import { equipmentSlotForPosition } from "#lib/equipment.ts";
import type { GameId } from "#lib/games.ts";
import { maxOutfitImageBytes, outfitImageSizes } from "#lib/outfit-submission.ts";
import {
  outfitEquipmentPosition,
  outfitImageRole,
  type OutfitEquipment,
  type OutfitImage,
} from "#lib/server/db/schema/outfit.ts";
import { ObjectStorage } from "#lib/server/storage/effect.ts";
import { OutfitListCache } from "../list/cache.ts";
import { getEquipmentSlots, hasReachedPublicationLimit, insertOutfit } from "./db.ts";
import { InvalidOutfitEquipment, InvalidOutfitImage, PublicationLimitReached } from "./errors.ts";

/** A new outfit from a signed-in author. Text is already trimmed and within schema limits. */
export type PublishOutfitInput = {
  readonly gameId: GameId;
  readonly authorId: string;
  readonly title: string;
  readonly description: string;
  readonly equipment: Partial<Record<OutfitEquipment["position"], string>>;
  /** WebP bytes by role. The first portrait is required because it is the thumbnail. */
  readonly images: { readonly "portrait-1": Uint8Array } & Partial<
    Record<OutfitImage["role"], Uint8Array>
  >;
};

const isValidImage = (role: OutfitImage["role"], body: Uint8Array) => {
  if (body.byteLength > maxOutfitImageBytes) return false;

  try {
    const { type, width, height } = imageSize(body);
    const expected = outfitImageSizes[role];
    return type === "webp" && width === expected.width && height === expected.height;
  } catch {
    // Unrecognized or truncated data has no readable dimensions.
    return false;
  }
};

/** Validate, store, and publish an immutable outfit, returning its new ID. */
export const publishOutfit = Effect.fn("publishOutfit")(function* (input: PublishOutfitInput) {
  const storage = yield* ObjectStorage;
  const listCache = yield* OutfitListCache;

  const outfitId = crypto.randomUUID();
  const images = outfitImageRole.enumValues.flatMap((role) => {
    const body = input.images[role];
    if (!body) return [];

    return [{ role, body, storageKey: `outfits/${outfitId}/${role}.webp` }];
  });

  for (const { role, body } of images) {
    if (!isValidImage(role, body)) return yield* new InvalidOutfitImage({ role });
  }

  const equipment = outfitEquipmentPosition.enumValues.flatMap((position) => {
    const equipmentId = input.equipment[position];
    if (!equipmentId) return [];

    return [{ position, equipmentId, equipmentSlot: equipmentSlotForPosition(position) }];
  });
  const catalogSlots = yield* getEquipmentSlots({
    gameId: input.gameId,
    equipmentIds: equipment.map(({ equipmentId }) => equipmentId),
  });

  for (const { position, equipmentId, equipmentSlot } of equipment) {
    const isInCatalog = catalogSlots.some(
      (piece) => piece.id === equipmentId && piece.slot === equipmentSlot,
    );
    if (!isInCatalog) return yield* new InvalidOutfitEquipment({ position });
  }

  if (yield* hasReachedPublicationLimit(input.authorId)) {
    return yield* new PublicationLimitReached();
  }

  // Storage and the database cannot share a transaction. Upload first so a committed
  // outfit always has its images, and remove this attempt's objects if anything fails.
  const removeImages = Effect.forEach(
    images,
    ({ storageKey }) =>
      storage
        .delete(storageKey)
        .pipe(
          Effect.catch((error) =>
            Effect.logWarning("Could not remove an image from a failed publication", error),
          ),
        ),
    { concurrency: 3, discard: true },
  );

  yield* Effect.forEach(
    images,
    ({ storageKey, body }) => storage.put(storageKey, { body, contentType: "image/webp" }),
    { concurrency: 3, discard: true },
  ).pipe(
    Effect.andThen(
      insertOutfit({
        outfit: {
          id: outfitId,
          gameId: input.gameId,
          authorId: input.authorId,
          title: input.title,
          description: input.description,
        },
        equipment,
        images: images.map(({ role, storageKey }) => ({ role, storageKey })),
      }),
    ),
    Effect.onError(() => removeImages),
  );

  // New outfits are never in the details cache, which does not retain misses.
  yield* listCache.invalidateAll;

  return outfitId;
});
