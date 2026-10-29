// Plain values shared by the database schema, server validation, and browser code.
// The schema imports them, so migrations stay the authoritative definition.

/** Image roles an outfit can have. `portrait-1` is the thumbnail. */
export const outfitImageRoles = ["portrait-1", "portrait-2", "landscape"] as const;

/** Longest outfit title, in characters. */
export const outfitTitleMaxLength = 100;

/** Longest outfit description, in characters. */
export const outfitDescriptionMaxLength = 2000;
