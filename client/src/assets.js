// Single background shared across all pages (swap this one path to retheme the whole app)
export const PAGE_BACKGROUND = '/assets/backgrounds/04c0843e119df1ba5b48cf7ee0d43da7.jpg';
// Set to null to use solid-color fallback:
// export const PAGE_BACKGROUND = null;

// Avatar pool — assigned deterministically by player name hash
// e.g. ['/assets/avatar-1.png', '/assets/avatar-2.png', ...]
export const AVATARS = [];

// Returns avatar URL for a given player name, or null if pool is empty
export function getAvatar(name) {
  if (!AVATARS.length) return null;
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATARS[hash % AVATARS.length];
}

// Night ceremony audio pacing — edit these to fine-tune voice-over timing
export const NIGHT_CEREMONY_CONFIG = {
  STEP_REPEAT_COUNT: 1,              // times to repeat each step's audio clip
  STEP_INTERVAL_MS: 2500,            // pause between steps (ms)
  FALLBACK_STEP_DURATION_MS: 3000,   // step duration when audio file is missing
};

// Role card illustrations — keys match role names from gameLogic
// back: card back image (null = use CSS-styled back)
// Arrays indicate multiple variants; getRoleCard picks one deterministically by player name.
export const ROLE_CARDS = {
  back:         '/assets/backgrounds/card_back.png',
  Merlin:       '/assets/role/merlin.png',
  Percival:     '/assets/role/percival.png',
  LoyalServant: ['/assets/role/loyal_servant.png', '/assets/role/loyal_servant_2.png'],
  Assassin:     '/assets/role/assasin.png',
  Morgana:      '/assets/role/morgana.png',
  Mordred:      '/assets/role/mordred.png',
  Oberon:       '/assets/role/oberon.png',
  Minion:       ['/assets/role/minion.png', '/assets/role/minion_2.png'],
};

// Returns the role card URL for a given role and player name.
// Array entries are picked deterministically by name hash so the same player
// always sees the same variant (stable across re-renders and page refreshes).
export function getRoleCard(role, playerName) {
  const entry = ROLE_CARDS[role];
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  const hash = [...(playerName || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return entry[hash % entry.length];
}
