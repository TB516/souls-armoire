<script lang="ts">
  import type { ComponentProps } from "svelte";
  import { equipmentSlotForPosition } from "#lib/equipment.ts";
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
      {@const slot = equipmentSlotForPosition(position)}
      <EquipmentPicker
        {gameId}
        {position}
        {label}
        equipment={equipment.filter((piece) => piece.slot === slot)}
        value={selected[position] ?? ""}
      />
    {/each}
  </div>
</fieldset>
