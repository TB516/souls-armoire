<script lang="ts">
  import EquipmentList from "#lib/components/EquipmentList.svelte";
  import OutfitGallery from "#lib/components/OutfitGallery.svelte";
  import { page } from "$app/state";
  import { games } from "#lib/games.ts";
  import type { PageProps } from "./$types";

  let { params, data }: PageProps = $props();

  const outfit = $derived(data.outfit);

  const dateFormat = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
</script>

<svelte:head>
  <title>{outfit.title} | Armoire</title>
  <meta name="description" content={outfit.description} />
</svelte:head>

<main class="mx-gutter py-8 sm:py-10">
  <nav class="flex flex-wrap gap-3 text-sm text-muted" aria-label="Breadcrumb">
    <a class="text-muted hover:text-accent-light" href={`/${params.gameId}${page.url.search}`}
      >← {games[params.gameId].name} outfits</a
    >
  </nav>
  <div
    class="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-x-10 xl:gap-x-12"
  >
    <header class="min-w-0">
      <h1 class="text-page-title font-semibold wrap-anywhere text-accent-light">
        {outfit.title}
      </h1>
      <p class="mt-2 text-sm text-muted">
        <time datetime={outfit.createdAt.toISOString()}>{dateFormat.format(outfit.createdAt)}</time>
      </p>
    </header>
    <section class="flex min-w-0 items-center gap-4 content-card" aria-label="Outfit creator">
      <div
        class="grid size-16 shrink-0 place-items-center rounded-sm bg-panel-raised text-2xl text-accent-light"
        aria-hidden="true"
      >
        {outfit.authorName.slice(0, 1).toUpperCase()}
      </div>
      <p class="min-w-0 text-lg font-semibold wrap-anywhere text-accent-light">
        {outfit.authorName}
      </p>
    </section>
    {#key outfit.id}
      <OutfitGallery title={outfit.title} images={outfit.images} />
    {/key}
    <div class="min-w-0 content-card">
      <p class="mb-8 leading-relaxed wrap-anywhere whitespace-pre-wrap xl:text-lg">
        {outfit.description}
      </p>
      <EquipmentList gameId={params.gameId} equipmentPieces={outfit.equipmentPieces} />
    </div>
  </div>
</main>
