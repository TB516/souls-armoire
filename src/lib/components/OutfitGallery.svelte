<script lang="ts">
  import { Dialog } from "bits-ui";
  import type { Effect } from "effect";
  import type { getOutfit } from "#lib/server/outfits/get/index.ts";
  import OutfitImage from "./OutfitImage.svelte";

  type Outfit = NonNullable<Effect.Success<ReturnType<typeof getOutfit>>>;
  type OutfitImages = Outfit["images"];

  let { title, images }: { title: string; images: OutfitImages } = $props();

  const imageDisplay = {
    "portrait-1": { label: "main portrait", order: 0 },
    "portrait-2": { label: "second portrait", order: 1 },
    landscape: { label: "landscape view", order: 2 },
  } satisfies Record<OutfitImages[number]["role"], { label: string; order: number }>;

  const orderedImages = $derived(
    images.toSorted((a, b) => imageDisplay[a.role].order - imageDisplay[b.role].order),
  );
  let open = $state(false);
  let selectedIndex = $state(0);
  const selectedImage = $derived(orderedImages[selectedIndex]);
</script>

{#snippet thumbnails()}
  <div
    class="flex shrink-0 flex-wrap justify-center gap-3"
    role="group"
    aria-label="Choose outfit image"
  >
    {#each orderedImages as image, index (image.role)}
      <button
        class={[
          "h-20 shrink-0 cursor-pointer rounded-sm border-2 p-1",
          image.role === "landscape" ? "aspect-[3/2]" : "aspect-[2/3]",
          index === selectedIndex ? "border-accent" : "border-transparent hover:border-accent",
        ]}
        type="button"
        aria-label={`Show ${imageDisplay[image.role].label}`}
        aria-pressed={index === selectedIndex}
        onclick={() => (selectedIndex = index)}
      >
        <OutfitImage src={image.url} alt="" framed={false} />
      </button>
    {/each}
  </div>
{/snippet}

<Dialog.Root bind:open>
  <section class="grid min-w-0 gap-4" aria-label="Outfit images">
    {#if selectedImage}
      <!-- On desktop, reserve height for the page header, thumbnails, and page padding. -->
      <Dialog.Trigger
        class="block h-[clamp(20rem,60svh,35rem)] w-full min-w-0 cursor-zoom-in sm:h-[clamp(24rem,60svh,40rem)] lg:h-[clamp(20rem,calc(100svh-26.5rem),56rem)]"
        type="button"
        aria-label={`Enlarge ${title}, ${imageDisplay[selectedImage.role].label}`}
      >
        <OutfitImage
          src={selectedImage.url}
          alt={`${title}, ${imageDisplay[selectedImage.role].label}`}
          loading="eager"
          framed={false}
        />
      </Dialog.Trigger>
    {/if}
    {#if orderedImages.length > 1}
      {@render thumbnails()}
    {/if}
  </section>

  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/80" />
    <Dialog.Content
      class="fixed inset-4 z-50 flex flex-col gap-4 bg-transparent p-4 text-foreground outline-none"
      onclick={(event) => {
        // Blank space inside the fullscreen layout also dismisses the viewer.
        if (!(event.target instanceof Element) || event.target.closest("button, img")) return;
        open = false;
      }}
    >
      <div class="flex shrink-0 items-center justify-between gap-4">
        <Dialog.Title class="min-w-0 text-sm wrap-anywhere text-muted">{title}</Dialog.Title>
        <Dialog.Close class="form-field w-auto shrink-0 hover:bg-panel-raised" type="button">
          Close
        </Dialog.Close>
      </div>
      {#if selectedImage}
        <div class="min-h-0 flex-1">
          <OutfitImage
            src={selectedImage.url}
            alt={`${title}, ${imageDisplay[selectedImage.role].label}`}
            loading="eager"
            framed={false}
          />
        </div>
      {/if}
      {#if orderedImages.length > 1}
        {@render thumbnails()}
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
