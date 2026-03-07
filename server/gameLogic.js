// Player counts per mission for 5-10 players
// [mission1, mission2, mission3, mission4, mission5]
const TEAM_SIZES = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

// Good/Evil split by player count
const TEAM_COUNTS = {
  5:  { good: 3, evil: 2 },
  6:  { good: 4, evil: 2 },
  7:  { good: 4, evil: 3 },
  8:  { good: 5, evil: 3 },
  9:  { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};

// Standard good and evil roles
const GOOD_ROLES = ['Merlin', 'Percival', 'LoyalServant'];
const EVIL_ROLES = ['Assassin', 'Morgana', 'Mordred', 'Oberon', 'Minion'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Assign roles to players.
 * selectedRoles: array of special role names the host has opted in
 * Returns { players } with role, team fields, or { error }
 */
function assignRoles(players, selectedRoles, playerCount) {
  const counts = TEAM_COUNTS[playerCount];
  if (!counts) return { error: `Unsupported player count: ${playerCount}` };

  const { good: goodCount, evil: evilCount } = counts;

  // Build evil role pool
  const wantedEvilSpecial = (selectedRoles || []).filter(r => EVIL_ROLES.includes(r) && r !== 'Minion');
  // Always ensure Assassin is present if evil special roles chosen
  let evilPool = [...wantedEvilSpecial];
  if (!evilPool.includes('Assassin')) evilPool.unshift('Assassin');
  // Pad with Minions
  while (evilPool.length < evilCount) evilPool.push('Minion');
  evilPool = evilPool.slice(0, evilCount);

  // Build good role pool
  const wantedGoodSpecial = (selectedRoles || []).filter(r => GOOD_ROLES.includes(r) && r !== 'LoyalServant');
  // Merlin is always present
  let goodPool = wantedGoodSpecial.includes('Merlin') ? [...wantedGoodSpecial] : ['Merlin', ...wantedGoodSpecial];
  // Pad with LoyalServants
  while (goodPool.length < goodCount) goodPool.push('LoyalServant');
  goodPool = goodPool.slice(0, goodCount);

  const allRoles = shuffle([...goodPool, ...evilPool]);

  const assignedPlayers = players.map((player, idx) => {
    const role = allRoles[idx];
    const team = GOOD_ROLES.includes(role) || role === 'LoyalServant' ? 'good' : 'evil';
    return { ...player, role, team };
  });

  return { players: assignedPlayers };
}

/**
 * Compute what a player sees during the night phase.
 * Returns { sees: [{ name, role? }] } — the list of players visible to this player.
 */
function computeNightVision(player, allPlayers) {
  const sees = [];

  switch (player.role) {
    case 'Merlin':
      // Merlin sees all evil except Mordred
      for (const p of allPlayers) {
        if (p.id !== player.id && p.team === 'evil' && p.role !== 'Mordred') {
          sees.push({ name: p.name, label: 'Evil' });
        }
      }
      break;

    case 'Percival': {
      // Percival sees Merlin and Morgana (but doesn't know which is which)
      // If Morgana is not in the game, Percival clearly identifies Merlin
      const morganaInGame = allPlayers.some(p => p.role === 'Morgana');
      for (const p of allPlayers) {
        if (p.role === 'Merlin' || p.role === 'Morgana') {
          sees.push({ name: p.name, label: morganaInGame ? 'Merlin or Morgana' : 'Merlin' });
        }
      }
      break;
    }

    case 'Assassin':
    case 'Morgana':
    case 'Minion':
      // Evil sees other evil except Oberon
      for (const p of allPlayers) {
        if (p.id !== player.id && p.team === 'evil' && p.role !== 'Oberon') {
          sees.push({ name: p.name, label: p.role });
        }
      }
      break;

    case 'Mordred':
      // Mordred sees other evil except Oberon, and is NOT seen by Merlin
      for (const p of allPlayers) {
        if (p.id !== player.id && p.team === 'evil' && p.role !== 'Oberon') {
          sees.push({ name: p.name, label: p.role });
        }
      }
      break;

    case 'Oberon':
      // Oberon sees nobody and nobody sees Oberon (among evil)
      break;

    case 'LoyalServant':
    default:
      // Loyal servants see nobody
      break;
  }

  return { sees };
}

/**
 * Get required team size for a mission.
 */
function getTeamSize(playerCount, missionNumber) {
  const sizes = TEAM_SIZES[playerCount];
  if (!sizes) return null;
  return sizes[missionNumber - 1] || null;
}

/**
 * Mission 4 requires two fails to fail when there are 7+ players.
 */
function requiresTwoFails(playerCount, missionNumber) {
  return playerCount >= 7 && missionNumber === 4;
}

/**
 * Check win condition based on missionResults array.
 * Returns 'good' | 'evil' | null (game not over)
 */
function checkWin(state) {
  const { missionResults } = state;
  const successes = missionResults.filter(r => r === 'success').length;
  const failures = missionResults.filter(r => r === 'fail').length;
  if (successes >= 3) return 'good';
  if (failures >= 3) return 'evil';
  return null;
}

/**
 * Rotate the leader to the next player.
 */
function advanceLeader(state) {
  state.leaderIndex = (state.leaderIndex + 1) % state.players.length;
}

/**
 * Assign roles with partial forced assignments.
 * forcedRoles: { [playerName]: roleName } — only entries provided are forced; rest are random.
 * Returns { players } or { error }.
 */
function assignRolesWithForced(players, selectedRoles, playerCount, forcedRoles) {
  const counts = TEAM_COUNTS[playerCount];
  if (!counts) return { error: `Unsupported player count: ${playerCount}` };
  const { good: goodCount, evil: evilCount } = counts;

  // Same pool-building as assignRoles
  const wantedEvilSpecial = (selectedRoles || []).filter(r => EVIL_ROLES.includes(r) && r !== 'Minion');
  let evilPool = [...wantedEvilSpecial];
  if (!evilPool.includes('Assassin')) evilPool.unshift('Assassin');
  while (evilPool.length < evilCount) evilPool.push('Minion');
  evilPool = evilPool.slice(0, evilCount);

  const wantedGoodSpecial = (selectedRoles || []).filter(r => GOOD_ROLES.includes(r) && r !== 'LoyalServant');
  let goodPool = wantedGoodSpecial.includes('Merlin') ? [...wantedGoodSpecial] : ['Merlin', ...wantedGoodSpecial];
  while (goodPool.length < goodCount) goodPool.push('LoyalServant');
  goodPool = goodPool.slice(0, goodCount);

  let availablePool = [...goodPool, ...evilPool];
  const result = players.map(p => ({ ...p }));

  // Apply forced roles
  for (const [name, role] of Object.entries(forcedRoles)) {
    const player = result.find(p => p.name === name);
    if (!player) return { error: `Unknown player: ${name}` };
    const idx = availablePool.indexOf(role);
    if (idx === -1) return { error: `Role "${role}" is not available in this game setup` };
    availablePool.splice(idx, 1);
    player.role = role;
    player.team = GOOD_ROLES.includes(role) ? 'good' : 'evil';
  }

  // Random assignment for the rest
  const remaining = shuffle(availablePool);
  let ri = 0;
  for (const player of result) {
    if (!player.role) {
      const role = remaining[ri++];
      player.role = role;
      player.team = GOOD_ROLES.includes(role) ? 'good' : 'evil';
    }
  }

  return { players: result };
}

module.exports = {
  assignRoles,
  assignRolesWithForced,
  computeNightVision,
  getTeamSize,
  requiresTwoFails,
  checkWin,
  advanceLeader,
  TEAM_COUNTS,
  TEAM_SIZES,
};
