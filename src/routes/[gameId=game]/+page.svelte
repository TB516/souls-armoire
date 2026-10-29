<script lang="ts">
  import { page as pageState } from "$app/state";
  import EquipmentFilters from "#lib/components/EquipmentFilters.svelte";
  import OutfitCard from "#lib/components/OutfitCard.svelte";
  import { games } from "#lib/games.ts";
  import { equipmentFields } from "#lib/components/equipment.ts";
  import { listEquipment } from "#lib/remote/equipment.remote.ts";
  import { outfitTitleMaxLength } from "#lib/outfits.ts";
  import type { ListOutfitsInput } from "#lib/server/outfits/list/db.ts";
  import type { PageProps } from "./$types";

  let { params, data }: PageProps = $props();

  const game = $derived(games[params.gameId]);
  const sortLabels = {
    newest: "Newest first",
    oldest: "Oldest first",
  } satisfies Record<ListOutfitsInput["sort"], string>;
  let filtersOpen = $state(false);
  let filterToggle = $state<HTMLButtonElement>();

  const { filters, gallery } = $derived(data);
  const equipment = $derived(await listEquipment({ gameId: params.gameId }));
  const activeEquipmentFilters = $derived(
    equipmentFields.filter(({ position }) => filters.equipment[position]),
  );
  const activeFilterCount = $derived(
    activeEquipmentFilters.length + Number(Boolean(filters.search)),
  );
  const isFiltered = $derived(Boolean(filters.search || activeEquipmentFilters.length));
  const collectionQuery = $derived(pageState.url.searchParams.toString());

  const buildCollectionUrl = ({
    page,
    removeFilter,
  }: {
    page: number;
    removeFilter?: "search" | keyof typeof filters.equipment;
  }) => {
    const searchParams = new URLSearchParams(collectionQuery);

    if (page === 1) {
      searchParams.delete("page");
    } else {
      searchParams.set("page", String(page));
    }

    if (removeFilter) searchParams.delete(removeFilter);

    const search = searchParams.toString();
    return `/${params.gameId}${search ? `?${search}` : ""}`;
  };
</script>

<svelte:head>
  <title>{game.name} outfits | Armoire</title>
  <meta name="description" content={`Browse outfits made by ${game.name} players.`} />
</svelte:head>

<main class="mx-gutter py-8 sm:py-10">
  <form
    action={`/${params.gameId}`}
    method="GET"
    data-sveltekit-reset="false"
    onsubmit={() => {
      if (!filtersOpen) return;
      filtersOpen = false;
      filterToggle?.focus();
    }}
  >
    <div class="mb-8 flex flex-wrap items-center justify-between gap-5">
      <h1 class="text-page-title font-semibold text-accent-light">{game.name} outfits</h1>
      <button
        bind:this={filterToggle}
        class="flex form-field w-auto items-center justify-between gap-3 lg:hidden"
        type="button"
        aria-expanded={filtersOpen}
        aria-controls="collection-filters"
        onclick={() => (filtersOpen = !filtersOpen)}
      >
        Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
        <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span>
      </button>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
      <div class={["min-w-0", !filtersOpen && "hidden lg:block"]}>
        <!-- A new result resets drafts to the filters used for that request. -->
        {#key filters}
          <aside class="content-card" id="collection-filters" aria-label="Collection filters">
            <div class="mb-6 grid gap-4">
              <label class="grid gap-2 text-sm text-muted" for="outfit-search">
                Search
                <input
                  class="form-field"
                  id="outfit-search"
                  type="search"
                  name="search"
                  placeholder="Search outfit titles"
                  maxlength={outfitTitleMaxLength}
                  value={filters.search}
                />
              </label>
              <label class="grid gap-2 text-sm text-muted" for="outfit-sort">
                Sort
                <select class="form-field" id="outfit-sort" name="sort" value={filters.sort}>
                  {#each Object.entries(sortLabels) as [sort, label] (sort)}
                    <option value={sort}>{label}</option>
                  {/each}
                </select>
              </label>
            </div>
            <EquipmentFilters gameId={params.gameId} {equipment} selected={filters.equipment} />
            <button class="mt-6 action-button w-full" type="submit">Apply filters</button>
          </aside>
        {/key}
      </div>

      <div class="min-w-0">
        {#if isFiltered}
          <nav class="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Active filters">
            {#if filters.search}
              <a
                class="max-w-full min-w-0 rounded-sm bg-panel-raised px-3 py-2 wrap-anywhere hover:text-accent-light"
                href={buildCollectionUrl({ page: 1, removeFilter: "search" })}
                aria-label={`Remove title search: ${filters.search}`}
              >
                {filters.search} <span class="ml-2 text-muted" aria-hidden="true">×</span>
              </a>
            {/if}
            {#each activeEquipmentFilters as { position, label } (position)}
              {@const piece = equipment.find((piece) => piece.id === filters.equipment[position])}
              <a
                class="max-w-full min-w-0 rounded-sm bg-panel-raised px-3 py-2 wrap-anywhere hover:text-accent-light"
                href={buildCollectionUrl({ page: 1, removeFilter: position })}
                aria-label={`Remove ${label} filter`}
              >
                <span class="text-muted">{label}:</span>
                {piece?.name ?? filters.equipment[position]}
                <span class="ml-2 text-muted" aria-hidden="true">×</span>
              </a>
            {/each}
            <a class="px-2 py-2 text-accent-light hover:underline" href={`/${params.gameId}`}>
              Clear filters
            </a>
          </nav>
        {/if}

        {#if gallery.outfits.length === 0}
          <section class="max-w-md py-12" aria-label="No outfits">
            <p class="text-lg">
              {#if filters.page > 1}Nothing on this page.
              {:else if isFiltered}No outfits match these filters.
              {:else}No outfits have been shared yet.{/if}
            </p>
            {#if filters.page > 1}
              <a
                class="mt-4 inline-block text-accent-light hover:underline"
                href={buildCollectionUrl({ page: 1 })}
              >
                Back to the first page
              </a>
            {/if}
          </section>
        {:else}
          <section
            class="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 xl:grid-cols-4 min-[100rem]:grid-cols-5 min-[120rem]:grid-cols-6"
            aria-label="Outfits"
          >
            {#each gallery.outfits as outfit, index (outfit.id)}
              <OutfitCard
                {outfit}
                gameId={params.gameId}
                {collectionQuery}
                loading={index < 4 ? "eager" : "lazy"}
              />
            {/each}
          </section>
        {/if}

        {#if filters.page > 1 || gallery.hasNextPage}
          <nav
            class="mt-10 flex items-center justify-between gap-4 text-sm text-muted"
            aria-label="Gallery pages"
          >
            {#if filters.page > 1}
              <a
                class="text-accent-light hover:underline"
                href={buildCollectionUrl({ page: filters.page - 1 })}
                rel="prev"
              >
                ← Previous
              </a>
            {:else}<span></span>{/if}
            <span>Page {filters.page}</span>
            {#if gallery.hasNextPage}
              <a
                class="text-accent-light hover:underline"
                href={buildCollectionUrl({ page: filters.page + 1 })}
                rel="next"
              >
                Next →
              </a>
            {:else}<span></span>{/if}
          </nav>
        {/if}
      </div>
    </div>
  </form>
</main>
