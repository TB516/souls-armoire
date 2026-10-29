CREATE TABLE "outfit_position_slot" (
	"position" "outfit_equipment_position" PRIMARY KEY,
	"slot" "equipment_slot" NOT NULL,
	CONSTRAINT "outfit_position_slot_position_slot_unique" UNIQUE("position","slot")
);
--> statement-breakpoint
-- Reference data: armor fits its own position and armaments fit either hand.
-- Seeded before the foreign key so existing outfit selections validate against it.
INSERT INTO "outfit_position_slot" ("position", "slot") VALUES
	('head', 'head'),
	('chest', 'chest'),
	('arms', 'arms'),
	('legs', 'legs'),
	('left-hand', 'armament'),
	('right-hand', 'armament');
--> statement-breakpoint
ALTER TABLE "outfit_equipment" DROP CONSTRAINT "outfit_equipment_position_slot_valid";--> statement-breakpoint
ALTER TABLE "outfit_equipment" ADD CONSTRAINT "outfit_equipment_position_slot_fkey" FOREIGN KEY ("position","equipment_slot") REFERENCES "outfit_position_slot"("position","slot") ON DELETE RESTRICT;