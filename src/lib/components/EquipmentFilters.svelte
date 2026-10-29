<script lang="ts">
  import type { ComponentProps } from "svelte";
  import type { GameId } from "#lib/games.ts";
  import type { ListOutfitsInput } from "#lib/server/outfits/list/db.ts";
  import { equipmentFields } from "./equipment.ts";
  import EquipmentPicker from "./EquipmentPicker.svelte";

  let {
    gameId,
    equipment,
    selected,
  }: {
    gameId: GameId;
    equipment: ComponentProps<typeof EquipmentPicker>["equipment"];
    selected: ListOutfitsInput["equipment"];
  } = $props();
</script>

<fieldset>
  <legend class="mb-5 font-semibold">Equipment</legend>
  <div class="grid gap-4">
    {#each equipmentFields as { position, label } (position)}
      <EquipmentPicker
        {gameId}
        {position}
        {label}
        equipment={equipment.filter((piece) => piece.positions.includes(position))}
        value={selected[position] ?? ""}
      />
    {/each}
  </div>
</fieldset>
