import { ne, sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { armorSlots } from "#lib/equipment.ts";
import {
  outfitDescriptionMaxLength,
  outfitImageRoles,
  outfitTitleMaxLength,
} from "#lib/outfits.ts";
import { equipment, equipmentSlot, game } from "./equipment.ts";

const handPositions = ["left-hand", "right-hand"] as const;

// Drizzle Kit requires a schema export to track this PostgreSQL enum in migrations.
export const outfitEquipmentPosition = pgEnum("outfit_equipment_position", [
  ...armorSlots,
  ...handPositions,
]);

/**
 * The catalog slot each outfit position accepts. Armor fits its own position and
 * armaments fit either hand. A migration seeds the rows, so this table is the only
 * definition of which items can go where.
 */
export const outfitPositionSlot = pgTable(
  "outfit_position_slot",
  {
    position: outfitEquipmentPosition("position").primaryKey(),
    slot: equipmentSlot("slot").notNull(),
  },
  (table) => [unique("outfit_position_slot_position_slot_unique").on(table.position, table.slot)],
);

export const outfitImageRole = pgEnum("outfit_image_role", outfitImageRoles);

/** A published outfit owned by one account and restricted to one game's catalog. */
export const outfit = pgTable(
  "outfit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    gameId: text("game_id")
      .notNull()
      .references(() => game.id, { onDelete: "restrict" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: outfitTitleMaxLength }).notNull(),
    description: varchar("description", { length: outfitDescriptionMaxLength }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("outfit_id_game_id_unique").on(table.id, table.gameId),
    index("outfit_game_created_at_idx").on(table.gameId, table.createdAt.desc()),
    index("outfit_author_id_idx").on(table.authorId),
    check("outfit_title_nonempty", ne(sql<string>`btrim(${table.title})`, "")),
    check("outfit_description_nonempty", ne(sql<string>`btrim(${table.description})`, "")),
  ],
);

/** One optional catalog selection for each armor or hand position in an outfit. */
export const outfitEquipment = pgTable(
  "outfit_equipment",
  {
    outfitId: uuid("outfit_id").notNull(),
    gameId: text("game_id").notNull(),
    position: outfitEquipmentPosition("position").notNull(),
    equipmentId: text("equipment_id").notNull(),
    equipmentSlot: equipmentSlot("equipment_slot").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.outfitId, table.position] }),
    foreignKey({
      name: "outfit_equipment_outfit_game_fkey",
      columns: [table.outfitId, table.gameId],
      foreignColumns: [outfit.id, outfit.gameId],
    }).onDelete("cascade"),
    foreignKey({
      name: "outfit_equipment_catalog_fkey",
      columns: [table.gameId, table.equipmentId, table.equipmentSlot],
      foreignColumns: [equipment.gameId, equipment.id, equipment.slot],
    }).onDelete("restrict"),
    foreignKey({
      name: "outfit_equipment_position_slot_fkey",
      columns: [table.position, table.equipmentSlot],
      foreignColumns: [outfitPositionSlot.position, outfitPositionSlot.slot],
    }).onDelete("restrict"),
    index("outfit_equipment_catalog_idx").on(table.gameId, table.equipmentId, table.equipmentSlot),
  ],
);

/** Storage-neutral metadata for an outfit screenshot. Image bytes live in object storage. */
export const outfitImage = pgTable(
  "outfit_image",
  {
    outfitId: uuid("outfit_id")
      .notNull()
      .references(() => outfit.id, { onDelete: "cascade" }),
    role: outfitImageRole("role").notNull(),
    storageKey: text("storage_key").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.outfitId, table.role] }),
    unique("outfit_image_storage_key_unique").on(table.storageKey),
    check("outfit_image_storage_key_nonempty", ne(sql<string>`btrim(${table.storageKey})`, "")),
  ],
);

export type Outfit = typeof outfit.$inferSelect;
export type OutfitEquipment = typeof outfitEquipment.$inferSelect;
export type OutfitImage = typeof outfitImage.$inferSelect;
