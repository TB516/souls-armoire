/** Supported games, keyed by the stable IDs used in URLs and database records. */
export const games = {
  "elden-ring": { name: "Elden Ring" },
} as const;

/** A supported game's ID, independent of its display name or hostname. */
export type GameId = keyof typeof games;

/** Every supported game's ID, for validating route parameters and request input. */
export const gameIds = Object.keys(games) as GameId[];
