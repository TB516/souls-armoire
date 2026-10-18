import { createAuthClient } from "better-auth/svelte";

/** Browser client for the existing same-origin Better Auth handler. */
export const authClient = createAuthClient();
