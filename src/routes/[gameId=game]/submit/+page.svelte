<script lang="ts">
  import { isHttpError } from "@sveltejs/kit";
  import { AlertDialog } from "bits-ui";
  import EquipmentPicker from "#lib/components/EquipmentPicker.svelte";
  import OutfitImageEditor from "#lib/components/OutfitImageEditor.svelte";
  import { equipmentFields } from "#lib/components/equipment.ts";
  import { equipmentSlotForPosition } from "#lib/equipment.ts";
  import { games } from "#lib/games.ts";
  import { equipmentFormKeys, imageFormKeys } from "#lib/outfit-submission.ts";
  import { listEquipment } from "#lib/remote/equipment.remote.ts";
  import { publishOutfit } from "#lib/remote/outfits.remote.ts";
  import type { PageProps } from "./$types";

  let { params, data }: PageProps = $props();

  const game = $derived(games[params.gameId]);
  const equipment = $derived(await listEquipment({ gameId: params.gameId }));
  const fields = publishOutfit.fields;

  let formElement = $state<HTMLFormElement>();
  let imageEditor = $state<ReturnType<typeof OutfitImageEditor>>();
  let confirmOpen = $state(false);
  let preparing = $state(false);
  let submitError = $state("");
  const busy = $derived(preparing || publishOutfit.pending > 0);

  const reviewOutfit = () => {
    submitError = "";
    // Check the main portrait as well, so every missing field is highlighted at once.
    const hasImages = imageEditor?.checkRequiredImages() ?? false;
    if (!formElement?.reportValidity() || !hasImages) return;

    confirmOpen = true;
  };

  const publish = async () => {
    confirmOpen = false;
    preparing = true;

    try {
      await imageEditor?.attachImages();
    } catch (error) {
      submitError = error instanceof Error ? error.message : "Could not prepare your images.";
      return;
    } finally {
      preparing = false;
    }

    formElement?.requestSubmit();
  };
</script>

<svelte:head>
  <title>Submit an outfit | Armoire</title>
  <meta name="description" content={`Share your ${game.name} outfit with other players.`} />
</svelte:head>

<main class="mx-gutter py-8 sm:py-10">
  <nav class="flex flex-wrap gap-3 text-sm text-muted" aria-label="Breadcrumb">
    <a class="text-muted hover:text-accent-light" href={`/${params.gameId}`}
      >← {game.name} outfits</a
    >
  </nav>

  {#if !data.user}
    <section class="mt-6 max-w-md content-card" aria-label="Sign in required">
      <h1 class="text-page-title font-semibold text-accent-light">Submit an outfit</h1>
      <p class="mt-3 text-muted">Sign in with Discord at the top of the page to share an outfit.</p>
    </section>
  {:else}
    <!-- The default remote form behavior shows an error page; keep the draft on failure instead. -->
    <form
      bind:this={formElement}
      class="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-x-10 xl:gap-x-12"
      enctype="multipart/form-data"
      {...publishOutfit.enhance(async ({ submit }) => {
        try {
          await submit();
        } catch (error) {
          submitError =
            isHttpError(error) && error.status < 500
              ? error.body.message
              : "Could not publish your outfit. Try again.";
        }
      })}
    >
      <input {...fields.gameId.as("hidden", params.gameId)} />

      <header class="min-w-0">
        <h1 class="sr-only">Submit an outfit</h1>
        <label class="sr-only" for="outfit-title">Title</label>
        <input
          {...fields.title.as("text")}
          class="min-h-11 w-full min-w-0 rounded-sm border border-line bg-panel px-3 py-2 text-page-title font-semibold text-accent-light placeholder:text-muted"
          id="outfit-title"
          placeholder="Outfit title"
          autocomplete="off"
          required
          maxlength="100"
        />
        {#each fields.title.issues() ?? [] as issue}
          <p class="mt-2 text-sm text-accent-light">{issue.message}</p>
        {/each}
      </header>

      <section class="flex min-w-0 items-center gap-4 content-card" aria-label="Outfit creator">
        <div
          class="grid size-16 shrink-0 place-items-center rounded-sm bg-panel-raised text-2xl text-accent-light"
          aria-hidden="true"
        >
          {data.user.name.slice(0, 1).toUpperCase()}
        </div>
        <div class="min-w-0">
          <p class="text-xs text-muted">Publishing as</p>
          <p class="text-lg font-semibold wrap-anywhere text-accent-light">{data.user.name}</p>
        </div>
      </section>

      <div class="grid min-w-0 gap-2">
        <OutfitImageEditor
          bind:this={imageEditor}
          names={{
            "portrait-1": fields.images[imageFormKeys["portrait-1"]].as("file").name,
            "portrait-2": fields.images[imageFormKeys["portrait-2"]].as("file").name,
            landscape: fields.images[imageFormKeys.landscape].as("file").name,
          }}
        />
        {#each fields.images.allIssues() ?? [] as issue}
          <p class="text-sm text-accent-light">{issue.message}</p>
        {/each}
      </div>

      <div class="min-w-0 content-card">
        <label class="sr-only" for="outfit-description">Description</label>
        <textarea
          {...fields.description.as("text")}
          class="block min-h-40 w-full min-w-0 resize-y rounded-sm border border-line bg-panel px-3 py-2 leading-relaxed placeholder:text-muted xl:text-lg"
          id="outfit-description"
          placeholder="Describe your outfit"
          required
          maxlength="2000"></textarea>
        {#each fields.description.issues() ?? [] as issue}
          <p class="mt-2 text-sm text-accent-light">{issue.message}</p>
        {/each}

        <fieldset class="mt-8">
          <legend class="mb-5 font-semibold">Equipment</legend>
          <div class="grid gap-4">
            {#each equipmentFields as { position, label } (position)}
              {@const field = fields.equipment[equipmentFormKeys[position]]}
              {@const slot = equipmentSlotForPosition(position)}
              <div class="grid gap-2">
                <EquipmentPicker
                  gameId={params.gameId}
                  {position}
                  {label}
                  equipment={equipment.filter((piece) => piece.slot === slot)}
                  name={field.as("hidden", "").name}
                  placeholder="Nothing equipped"
                />
                {#each field.issues() ?? [] as issue}
                  <p class="text-sm text-accent-light">{issue.message}</p>
                {/each}
              </div>
            {/each}
          </div>
        </fieldset>

        <div class="mt-8 grid gap-3">
          {#each fields.issues() ?? [] as issue}
            <p class="text-sm text-accent-light" role="alert">{issue.message}</p>
          {/each}
          {#if submitError}
            <p class="text-sm text-accent-light" role="alert">{submitError}</p>
          {/if}
          <button
            class="action-button w-full disabled:opacity-60"
            type="button"
            disabled={busy}
            aria-busy={busy}
            onclick={reviewOutfit}
          >
            {#if preparing}Preparing images…{:else if publishOutfit.pending > 0}Publishing…{:else}Publish
              outfit{/if}
          </button>
        </div>
      </div>
    </form>

    <AlertDialog.Root bind:open={confirmOpen}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/80" />
        <AlertDialog.Content
          class="fixed top-1/2 left-1/2 z-50 grid w-[min(28rem,calc(100vw-2rem))] -translate-1/2 gap-4 rounded-sm border border-line bg-panel-raised p-6 shadow-lg"
        >
          <AlertDialog.Title class="text-lg font-semibold text-accent-light">
            Publish this outfit?
          </AlertDialog.Title>
          <AlertDialog.Description class="text-sm text-muted">
            Published outfits cannot be edited. Check the title, description, equipment, and images
            before you continue.
          </AlertDialog.Description>
          <div class="flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel class="form-field w-auto hover:bg-panel" type="button">
              Keep editing
            </AlertDialog.Cancel>
            <AlertDialog.Action class="action-button" type="button" onclick={publish}>
              Publish
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  {/if}
</main>
