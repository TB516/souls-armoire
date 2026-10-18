import type { LayoutServerLoad } from "./$types";

/** Make the authenticated user available to the global header. */
export const load = (({ locals }) => ({ user: locals.user })) satisfies LayoutServerLoad;
