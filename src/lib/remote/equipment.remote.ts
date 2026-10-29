import { prerender } from "$app/server";
import { Schema } from "effect";
import { gameIds } from "#lib/games.ts";
import { listEquipment as listEquipmentEffect } from "#lib/server/equipment/list/index.ts";
import { serverRuntime } from "#lib/server/runtime.ts";

const listEquipmentInput = Schema.toStandardSchemaV1(
  Schema.Struct({ gameId: Schema.Literals(gameIds) }),
);

/** Build each game's equipment catalog once per deployment for the filter controls. */
export const listEquipment = prerender(
  listEquipmentInput,
  (input) => serverRuntime.runPromise(listEquipmentEffect(input)),
  { inputs: () => gameIds.map((gameId) => ({ gameId })) },
);
