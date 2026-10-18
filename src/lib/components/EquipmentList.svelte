<script lang="ts">
  import type { Effect } from "effect";
  import { equipmentIconPath } from "#lib/equipment.ts";
  import type { GameId } from "#lib/games.ts";
  import type { getOutfit } from "#lib/server/outfits/get/index.ts";
  import { equipmentFields } from "./equipment.ts";

  type Outfit = NonNullable<Effect.Success<ReturnType<typeof getOutfit>>>;
  type EquipmentPiece = Outfit["equipmentPieces"][number];

  let { gameId, equipmentPieces }: { gameId: GameId; equipmentPieces: EquipmentPiece[] } = $props();

  const sourceNames = {
    "base-game": "Base game",
    "shadow-of-the-erdtree": "Shadow of the Erdtree",
    "tarnished-pack": "Tarnished Pack",
  } satisfies Record<EquipmentPiece["source"], string>;
</script>

<section aria-label="Equipment">
  <h2 class="mb-5 font-semibold">Equipment</h2>
  <ul class="grid gap-3">
    {#each equipmentFields as { position, label } (position)}
      {@const equipmentPiece = equipmentPieces.find((piece) => piece.position === position)}
      <li
        class="flex min-h-18 items-center gap-4 [contain-intrinsic-block-size:auto_4.5rem] [content-visibility:auto]"
      >
        <div class="size-16 shrink-0 rounded-sm bg-panel-raised p-2">
          {#if equipmentPiece}
            <img
              class="size-full object-contain"
              src={equipmentIconPath(gameId, equipmentPiece.id)}
              alt=""
              loading="lazy"
              width="64"
              height="64"
            />
          {/if}
        </div>
        <div class="min-w-0 wrap-anywhere">
          <span class="text-xs text-muted">{label}</span>
          {#if equipmentPiece}
            <a
              class="block leading-snug hover:text-accent-light hover:underline xl:text-lg"
              href={`/${gameId}?${new URLSearchParams({ [position]: equipmentPiece.id })}`}
              aria-label={`Find outfits with ${equipmentPiece.name} in ${label}`}
              >{equipmentPiece.name}</a
            >
            <p class="mt-1 text-xs text-muted">
              {#if equipmentPiece.category}{`${equipmentPiece.category} · `}{/if}{sourceNames[
                equipmentPiece.source
              ]}
            </p>
          {:else}
            <p class="text-sm text-muted">Nothing equipped</p>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</section>
