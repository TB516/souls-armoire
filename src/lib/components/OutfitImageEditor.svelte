<script lang="ts">
  import { onDestroy } from "svelte";
  import Cropper, { type CropArea, type Point } from "svelte-easy-crop";
  import { outfitImageSizes } from "#lib/outfit-submission.ts";
  import type { OutfitImage } from "#lib/server/db/schema/outfit.ts";
  import { canDecodeImage, exportCroppedWebP, maxSourceImageBytes } from "./image-export.ts";

  type Role = OutfitImage["role"];

  type ImageSelection = {
    file: File;
    url: string;
    crop: Point;
    zoom: number;
    /** Cropped area in source pixels, used to export the image. */
    pixels: CropArea | null;
    /** Cropped area in percentages, used for the thumbnail preview. */
    percent: CropArea | null;
  };

  /** Form field names for the converted images, by role. */
  let { names }: { names: Record<Role, string> } = $props();

  const imageDisplay = {
    "portrait-1": { label: "Main portrait", hint: "Required. Shown as the outfit thumbnail." },
    "portrait-2": { label: "Second portrait", hint: "Optional." },
    landscape: { label: "Landscape view", hint: "Optional." },
  } satisfies Record<Role, { label: string; hint: string }>;
  const roles = ["portrait-1", "portrait-2", "landscape"] as const satisfies Role[];

  let selections = $state<Partial<Record<Role, ImageSelection>>>({});
  let selectedRole = $state<Role>("portrait-1");
  let error = $state("");
  const fileInputs = $state<Partial<Record<Role, HTMLInputElement>>>({});

  const selection = $derived(selections[selectedRole]);
  const display = $derived(imageDisplay[selectedRole]);
  const size = $derived(outfitImageSizes[selectedRole]);

  const removeImage = (role: Role) => {
    const removed = selections[role];
    if (!removed) return;

    URL.revokeObjectURL(removed.url);
    delete selections[role];
  };

  const chooseImage = async (role: Role, input: HTMLInputElement) => {
    const file = input.files?.[0];
    // Clear the picker so choosing the same file again still triggers a change.
    input.value = "";
    if (!file) return;

    error = "";

    if (file.size > maxSourceImageBytes) {
      error = `Choose an image of ${maxSourceImageBytes / 1024 / 1024} MB or less.`;
      return;
    }
    if (!(await canDecodeImage(file))) {
      error = "This browser cannot open that file. Try a PNG, JPEG, or WebP image.";
      return;
    }

    removeImage(role);
    selections[role] = {
      file,
      url: URL.createObjectURL(file),
      crop: { x: 0, y: 0 },
      zoom: 1,
      pixels: null,
      percent: null,
    };
  };

  /** Show the main portrait with an explanation if it has not been chosen. */
  export const checkRequiredImages = () => {
    if (selections["portrait-1"]) return true;

    selectedRole = "portrait-1";
    error = "Add a main portrait. It is the outfit thumbnail.";
    return false;
  };

  /** Convert each cropped image to WebP and place it in its form field. */
  export const attachImages = async () => {
    for (const role of roles) {
      const transfer = new DataTransfer();
      const chosen = selections[role];

      if (chosen) {
        if (!chosen.pixels) {
          selectedRole = role;
          throw new Error(`Check the crop of the ${imageDisplay[role].label.toLowerCase()}.`);
        }

        transfer.items.add(
          await exportCroppedWebP(
            chosen.file,
            chosen.pixels,
            outfitImageSizes[role],
            `${role}.webp`,
          ),
        );
      }

      const input = fileInputs[role];
      if (input) input.files = transfer.files;
    }
  };

  onDestroy(() => {
    for (const chosen of Object.values(selections)) URL.revokeObjectURL(chosen.url);
  });
</script>

{#snippet fileInput()}
  <input
    class="sr-only"
    type="file"
    accept="image/*"
    onchange={(event) => chooseImage(selectedRole, event.currentTarget)}
  />
{/snippet}

<section class="grid min-w-0 gap-4" aria-label="Outfit images">
  <p class="text-sm text-muted">
    <span class="font-semibold text-foreground">{display.label}</span>
    {display.hint}
  </p>

  <!-- Matches the outfit page's image height so the layout stays the same after publishing. -->
  <div
    class="relative h-[clamp(20rem,60svh,35rem)] w-full min-w-0 overflow-hidden rounded-sm bg-panel sm:h-[clamp(24rem,60svh,40rem)] lg:h-[clamp(20rem,calc(100svh-26.5rem),56rem)]"
  >
    {#if selection}
      {#key selection.url}
        <Cropper
          image={selection.url}
          aspect={size.width / size.height}
          bind:crop={selection.crop}
          bind:zoom={selection.zoom}
          oncropcomplete={({ pixels, percent }) => {
            selection.pixels = pixels;
            selection.percent = percent;
          }}
        />
      {/key}
    {:else}
      <label
        class="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-line p-6 text-center focus-within:border-accent hover:border-accent"
      >
        <span class="action-button">Choose {display.label.toLowerCase()}</span>
        <span class="text-sm text-muted">
          Any image your browser can open, up to {maxSourceImageBytes / 1024 / 1024} MB.
        </span>
        {@render fileInput()}
      </label>
    {/if}
  </div>

  {#if selection}
    <div class="flex flex-wrap items-center gap-3">
      <label class="flex min-w-48 flex-1 items-center gap-3 text-sm text-muted">
        Zoom
        <input
          class="min-w-0 flex-1 accent-accent"
          type="range"
          min="1"
          max="3"
          step="0.01"
          bind:value={selection.zoom}
        />
      </label>
      <label
        class="form-field w-auto cursor-pointer focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-accent-light hover:bg-panel-raised"
      >
        Replace
        {@render fileInput()}
      </label>
      <button
        class="form-field w-auto hover:bg-panel-raised"
        type="button"
        onclick={() => removeImage(selectedRole)}
      >
        Remove
      </button>
    </div>
    <p class="text-xs text-muted">Drag to reposition. Scroll, pinch, or use the slider to zoom.</p>
  {/if}

  {#if error}
    <p class="text-sm text-accent-light" role="alert">{error}</p>
  {/if}

  <div class="flex flex-wrap justify-center gap-3" role="group" aria-label="Choose image to edit">
    {#each roles as role (role)}
      {@const preview = selections[role]}
      <button
        class={[
          "h-20 shrink-0 cursor-pointer rounded-sm border-2 p-1",
          role === selectedRole ? "border-accent" : "border-transparent hover:border-accent",
        ]}
        type="button"
        aria-label={`Edit ${imageDisplay[role].label.toLowerCase()}`}
        aria-pressed={role === selectedRole}
        onclick={() => (selectedRole = role)}
      >
        <div
          class={[
            "relative h-full overflow-hidden rounded-sm bg-panel",
            role === "landscape" ? "aspect-[3/2]" : "aspect-[2/3]",
          ]}
        >
          {#if preview?.percent}
            <!-- Position the source so only the cropped area fills the thumbnail. -->
            <img
              class="absolute max-w-none"
              style:width={`${10000 / preview.percent.width}%`}
              style:left={`${(-100 * preview.percent.x) / preview.percent.width}%`}
              style:top={`${(-100 * preview.percent.y) / preview.percent.height}%`}
              src={preview.url}
              alt=""
            />
          {:else}
            <span class="grid size-full place-items-center text-muted" aria-hidden="true">+</span>
          {/if}
        </div>
      </button>
    {/each}
  </div>

  <!-- Converted images are submitted from these fields; the pickers above keep the originals. -->
  {#each roles as role (role)}
    <input bind:this={fileInputs[role]} type="file" name={names[role]} hidden />
  {/each}
</section>
