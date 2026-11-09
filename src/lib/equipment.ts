import type { GameId } from "./games.ts";
import type { Equipment } from "./server/db/schema/equipment.ts";
import type { OutfitEquipment } from "./server/db/schema/outfit.ts";

/** Armor positions shared by the equipment catalog and outfit selections. */
export const armorSlots = ["head", "chest", "arms", "legs"] as const;

/** Resolves an equipment ID to its static icon URL. */
export const equipmentIconPath = (gameId: GameId, equipmentId: string): string =>
  `/${encodeURIComponent(gameId)}/equipment/${encodeURIComponent(equipmentId)}.webp`;

/** The catalog slot an outfit position accepts; either hand holds an armament. */
export const equipmentSlotForPosition = (
  position: OutfitEquipment["position"],
): Equipment["slot"] =>
  position === "left-hand" || position === "right-hand" ? "armament" : position;
