<script lang="ts">
  import { refreshAll } from "$app/navigation";
  import { page } from "$app/state";
  import { DropdownMenu } from "bits-ui";
  import { authClient } from "#lib/auth-client.ts";
  import type { LayoutData } from "../../routes/$types";

  let { user }: { user: LayoutData["user"] } = $props();

  let pending = $state<"sign-in" | "sign-out" | null>(null);
  let error = $state("");
  const callbackFailed = $derived(page.url.searchParams.has("error"));

  const signIn = async () => {
    if (pending) return;

    pending = "sign-in";
    error = "";

    // Copy the current page URL so callback cleanup does not change page state.
    const returnURL = new URL(page.url.href);
    // Better Auth appends these parameters on failure; exclude them from retries.
    returnURL.searchParams.delete("error");
    returnURL.searchParams.delete("error_description");

    try {
      const result = await authClient.signIn.social({
        provider: "discord",
        callbackURL: returnURL.href,
        errorCallbackURL: returnURL.href,
      });
      if (!result.error) return;
    } catch {
      // Network failures need the same retry action as an unsuccessful response.
    }

    error = "Could not sign in with Discord. Try again.";
    pending = null;
  };

  const signOut = async () => {
    if (pending) return;

    pending = "sign-out";
    error = "";

    try {
      const result = await authClient.signOut();
      if (result.error) {
        error = "Could not sign out. Try again.";
        return;
      }

      await refreshAll();
    } catch {
      error = "Could not update your account. Reload the page and try again.";
    } finally {
      pending = null;
    }
  };
</script>

<div class="flex min-w-0 flex-col items-end gap-2">
  {#if user}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-panel-raised disabled:opacity-60"
        aria-label={`Account menu for ${user.name}`}
        disabled={pending !== null}
        aria-busy={pending === "sign-out"}
      >
        <span class="max-w-40 truncate sm:max-w-64">
          {pending === "sign-out" ? "Signing out…" : user.name}
        </span>
        <span aria-hidden="true">⌄</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class="z-30 min-w-36 rounded-sm border border-line bg-panel-raised p-1 shadow-lg"
          align="end"
          sideOffset={8}
          collisionPadding={12}
        >
          <DropdownMenu.Item
            class="flex min-h-11 cursor-pointer items-center rounded-sm px-3 py-2 text-sm data-highlighted:bg-panel data-highlighted:text-accent-light"
            onSelect={signOut}
          >
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  {:else}
    <button
      class="action-button disabled:opacity-60"
      type="button"
      disabled={pending !== null}
      aria-busy={pending === "sign-in"}
      onclick={signIn}
    >
      {pending === "sign-in" ? "Connecting to Discord…" : "Sign in with Discord"}
    </button>
  {/if}

  {#if error || callbackFailed}
    <p class="max-w-72 text-right text-sm text-accent-light" role="alert">
      {error || "Discord sign-in did not finish. Try signing in again."}
    </p>
  {/if}
</div>
