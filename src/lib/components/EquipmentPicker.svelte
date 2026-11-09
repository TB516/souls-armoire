<script lang="ts">
  import { Combobox } from "bits-ui";
  import { equipmentIconPath } from "#lib/equipment.ts";
  import type { GameId } from "#lib/games.ts";
  import type { OutfitEquipment } from "#lib/server/db/schema/outfit.ts";
  import type { listEquipment } from "#lib/remote/equipment.remote.ts";

  let {
    gameId,
    position,
    label,
    equipment,
    value = "",
    name = position,
    placeholder = "Any",
  }: {
    gameId: GameId;
    position: OutfitEquipment["position"];
    label: string;
    equipment: Awaited<ReturnType<typeof listEquipment>>;
    value?: string;
    /** Form field name; defaults to the position used by collection filters. */
    name?: string;
    placeholder?: string;
  } = $props();

  const selected = $derived(equipment.find((piece) => piece.id === value));
  const items = $derived(equipment.map((piece) => ({ value: piece.id, label: piece.name })));
  let open = $state(false);
  let search = $state("");
  let field = $state<HTMLDivElement>();
  const matches = $derived(
    equipment.filter((piece) => piece.name.toLowerCase().includes(search.trim().toLowerCase())),
  );

  const openPicker = () => {
    if (open) return;

    search = selected?.name ?? "";
    open = true;
  };
</script>

<Combobox.Root
  type="single"
  bind:value
  bind:open
  {items}
  {name}
  allowDeselect={false}
  inputValue={selected?.name ?? ""}
  onOpenChange={(isOpen) => (search = isOpen ? (selected?.name ?? "") : "")}
>
  <div class="grid min-w-0 gap-2">
    <label class="text-sm text-muted" for={`${position}-search`}>{label}</label>
    <div
      bind:this={field}
      class="flex form-field items-center gap-2 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-accent-light"
    >
      {#if selected && !open}
        <img
          class="size-8 shrink-0 object-contain"
          src={equipmentIconPath(gameId, selected.id)}
          alt=""
          loading="lazy"
          width="32"
          height="32"
        />
      {/if}
      <Combobox.Input
        class="min-w-0 flex-1 bg-transparent outline-none"
        id={`${position}-search`}
        autocomplete="off"
        spellcheck="false"
        {placeholder}
        onfocus={openPicker}
        onclick={openPicker}
        oninput={(event) => {
          search = event.currentTarget.value;
          open = true;
          if (!search) value = "";
        }}
        onkeydown={(event) => {
          // Bits UI handles Enter when open; a closed picker must not submit the form.
          if (event.key === "Enter" && !open && !event.isComposing) event.preventDefault();
        }}
      >
        {#snippet child({ props })}
          <!-- Closing the picker restores the selected equipment name. -->
          <input {...props} value={open ? search : (selected?.name ?? "")} />
        {/snippet}
      </Combobox.Input>
      {#if value || search}
        <button
          class="shrink-0 px-1 text-muted hover:text-foreground"
          type="button"
          aria-label={`Clear ${label.toLowerCase()}`}
          onclick={() => {
            value = "";
            search = "";
            open = false;
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      {:else}
        <Combobox.Trigger class="shrink-0 text-muted" aria-label={`Choose ${label.toLowerCase()}`}>
          <span aria-hidden="true">⌄</span>
        </Combobox.Trigger>
      {/if}
    </div>
  </div>

  <Combobox.Portal>
    <Combobox.Content
      class="z-20 flex max-h-[min(16rem,var(--bits-combobox-content-available-height))] w-(--bits-combobox-anchor-width) max-w-(--bits-combobox-content-available-width) flex-col gap-1 overflow-y-auto overscroll-contain rounded-md border border-line bg-panel-raised p-1 shadow-lg"
      customAnchor={field}
      sideOffset={8}
      align="start"
      collisionPadding={12}
      aria-label={`${label} equipment`}
    >
      {#each matches as piece (piece.id)}
        <Combobox.Item
          class="flex min-h-14 shrink-0 items-center gap-2 rounded-sm p-2 text-sm leading-snug [contain-intrinsic-block-size:auto_2.5rem] [content-visibility:auto] data-highlighted:bg-panel data-highlighted:text-accent-light data-selected:text-accent-light"
          value={piece.id}
          label={piece.name}
        >
          {#snippet children({ selected: isSelected })}
            <div class="size-10 shrink-0 rounded-sm bg-panel p-1">
              <img
                class="size-full object-contain"
                src={equipmentIconPath(gameId, piece.id)}
                alt=""
                loading="lazy"
                width="32"
                height="32"
              />
            </div>
            <span class="min-w-0 flex-1 wrap-anywhere">{piece.name}</span>
            <span class="size-4 shrink-0 text-accent-light" aria-hidden="true">
              {#if isSelected}✓{/if}
            </span>
          {/snippet}
        </Combobox.Item>
      {:else}
        <p class="px-3 py-4 text-sm text-muted" role="status">No matching equipment.</p>
      {/each}
    </Combobox.Content>
  </Combobox.Portal>
</Combobox.Root>
