<script lang="ts">
  import "../app.css";
  import AccountMenu from "#lib/components/AccountMenu.svelte";
  import type { LayoutProps } from "./$types";

  let { children, data }: LayoutProps = $props();
</script>

<div class="flex min-h-screen flex-col">
  <header class="mx-gutter flex min-h-15 items-center justify-between gap-4 py-3">
    <a class="inline-flex shrink-0 items-center gap-3 font-bold tracking-widest uppercase" href="/">
      <span class="size-3 rotate-45 bg-accent" aria-hidden="true"></span>
      Armoire
    </a>
    <AccountMenu user={data.user} />
  </header>

  {@render children()}
</div>
