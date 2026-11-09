import type { OutfitEquipment, OutfitImage } from "#lib/server/db/schema/outfit.ts";

/** Published image dimensions. The browser crops to these sizes and the server enforces them. */
export const outfitImageSizes = {
  "portrait-1": { width: 800, height: 1200 },
  "portrait-2": { width: 800, height: 1200 },
  landscape: { width: 1200, height: 800 },
} as const satisfies Record<OutfitImage["role"], { width: number; height: number }>;

/** Largest converted WebP image accepted for one outfit image. */
export const maxOutfitImageBytes = 2 * 1024 * 1024;

// Remote form field names must be identifiers, so hyphenated schema values need form keys.

/** Submission form keys for each equipment position. */
export const equipmentFormKeys = {
  head: "head",
  chest: "chest",
  arms: "arms",
  legs: "legs",
  "left-hand": "leftHand",
  "right-hand": "rightHand",
} as const satisfies Record<OutfitEquipment["position"], string>;

/** Submission form keys for each image role. */
export const imageFormKeys = {
  "portrait-1": "portrait1",
  "portrait-2": "portrait2",
  landscape: "landscape",
} as const satisfies Record<OutfitImage["role"], string>;
