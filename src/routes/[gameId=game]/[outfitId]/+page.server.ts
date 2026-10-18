import { error } from "@sveltejs/kit";
import { Schema } from "effect";
import { getOutfit } from "#lib/server/outfits/get/index.ts";
import { serverRuntime } from "#lib/server/runtime.ts";
import type { PageServerLoad } from "./$types";

const isOutfitId = Schema.is(Schema.String.check(Schema.isUUID()));

/** Load the route's outfit with its equipment and fresh signed image URLs. */
export const load = (async ({ params }) => {
  if (!isOutfitId(params.outfitId)) {
    error(400, "Invalid outfit ID");
  }

  const outfit = await serverRuntime.runPromise(
    getOutfit({ gameId: params.gameId, outfitId: params.outfitId }),
  );

  if (!outfit) {
    error(404, "Outfit not found");
  }

  return { outfit };
}) satisfies PageServerLoad;
