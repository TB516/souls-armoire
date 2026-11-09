import { error, invalid, redirect } from "@sveltejs/kit";
import { form, getRequestEvent } from "$app/server";
import { Effect, Schema } from "effect";
import { games, type GameId } from "#lib/games.ts";
import {
  equipmentFormKeys,
  imageFormKeys,
  maxOutfitImageBytes,
  outfitImageSizes,
} from "#lib/outfit-submission.ts";
import { outfitEquipmentPosition, type OutfitEquipment } from "#lib/server/db/schema/outfit.ts";
import { publicationLimit } from "#lib/server/outfits/publish/db.ts";
import {
  publishOutfit as publishOutfitEffect,
  type PublishOutfitInput,
} from "#lib/server/outfits/publish/index.ts";
import { serverRuntime } from "#lib/server/runtime.ts";

const gameIds = Object.keys(games) as GameId[];

// Empty pickers submit an empty string, which means nothing is equipped.
const equipmentId = Schema.optionalKey(Schema.String.check(Schema.isMaxLength(64)));

const publishOutfitRequest = Schema.Struct({
  gameId: Schema.Literals(gameIds),
  title: Schema.Trim.check(
    Schema.isMinLength(1, { message: "Enter a title." }),
    Schema.isMaxLength(100, { message: "Use 100 characters or fewer." }),
  ),
  description: Schema.Trim.check(
    Schema.isMinLength(1, { message: "Enter a description." }),
    Schema.isMaxLength(2000, { message: "Use 2,000 characters or fewer." }),
  ),
  equipment: Schema.optionalKey(
    Schema.Struct({
      head: equipmentId,
      chest: equipmentId,
      arms: equipmentId,
      legs: equipmentId,
      leftHand: equipmentId,
      rightHand: equipmentId,
    } satisfies Record<
      (typeof equipmentFormKeys)[OutfitEquipment["position"]],
      typeof equipmentId
    >),
  ),
  images: Schema.Struct({
    portrait1: Schema.File,
    portrait2: Schema.optionalKey(Schema.File),
    landscape: Schema.optionalKey(Schema.File),
  }),
});

const readBytes = async (file: File) => new Uint8Array(await file.arrayBuffer());

/** Publish a signed-in user's outfit, then open it. Published outfits cannot be edited. */
export const publishOutfit = form(
  Schema.toStandardSchemaV1(publishOutfitRequest),
  async (request, issue) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Sign in to publish an outfit.");
    }

    const equipment: PublishOutfitInput["equipment"] = {};
    for (const position of outfitEquipmentPosition.enumValues) {
      const id = request.equipment?.[equipmentFormKeys[position]];
      if (id) equipment[position] = id;
    }

    const images: PublishOutfitInput["images"] = {
      "portrait-1": await readBytes(request.images.portrait1),
    };
    if (request.images.portrait2) images["portrait-2"] = await readBytes(request.images.portrait2);
    if (request.images.landscape) images.landscape = await readBytes(request.images.landscape);

    const outcome = await serverRuntime.runPromise(
      publishOutfitEffect({
        gameId: request.gameId,
        authorId: locals.user.id,
        title: request.title,
        description: request.description,
        equipment,
        images,
      }).pipe(
        Effect.map((outfitId) => ({ outfitId })),
        Effect.catchTags({
          InvalidOutfitImage: ({ role }) => {
            const { width, height } = outfitImageSizes[role];
            const maxMegabytes = maxOutfitImageBytes / 1024 / 1024;
            return Effect.succeed({
              issue: issue.images[imageFormKeys[role]](
                `Images must be ${width} × ${height} WebP files up to ${maxMegabytes} MB.`,
              ),
            });
          },
          InvalidOutfitEquipment: ({ position }) =>
            Effect.succeed({
              issue: issue.equipment[equipmentFormKeys[position]](
                "Choose equipment from the list.",
              ),
            }),
          PublicationLimitReached: () =>
            Effect.succeed({
              issue: `You can publish ${publicationLimit} outfits in 24 hours. Try again later.`,
            }),
        }),
      ),
    );

    if ("issue" in outcome) invalid(outcome.issue);

    redirect(303, `/${request.gameId}/${outcome.outfitId}`);
  },
);
