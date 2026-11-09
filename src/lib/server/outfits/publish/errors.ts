import { Data } from "effect";
import type { OutfitEquipment, OutfitImage } from "#lib/server/db/schema/outfit.ts";

/** An uploaded image is not a WebP of its role's dimensions and size limit. */
export class InvalidOutfitImage extends Data.TaggedError("InvalidOutfitImage")<{
  role: OutfitImage["role"];
}> {}

/** A selected item is not in the game's catalog or does not fit its position. */
export class InvalidOutfitEquipment extends Data.TaggedError("InvalidOutfitEquipment")<{
  position: OutfitEquipment["position"];
}> {}

/** The author has used every publication allowed in the rolling window. */
export class PublicationLimitReached extends Data.TaggedError("PublicationLimitReached")<{}> {}
