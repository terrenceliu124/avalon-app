// Drop image files into client/public/assets/
// Then update the paths below (null = no image, use solid color fallback)

export const PAGE_BACKGROUNDS = {
  home:         null,   // e.g. '/assets/bg-home.jpg'
  lobby:        null,
  roleReveal:   null,
  night:        null,
  teamProposal: null,
  voting:       null,
  quest:        null,
  assassination: null,
  gameOver:     null,
};

// Avatar pool — assigned deterministically by player name hash
// e.g. ['/assets/avatar-1.png', '/assets/avatar-2.png', ...]
export const AVATARS = [];

// Returns avatar URL for a given player name, or null if pool is empty
export function getAvatar(name) {
  if (!AVATARS.length) return null;
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATARS[hash % AVATARS.length];
}
