const {
  assignRoles,
  computeNightVision,
  getTeamSize,
  requiresTwoFails,
  checkWin,
  advanceLeader,
  TEAM_COUNTS,
} = require('../gameLogic');

function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `socket-${i}`,
    name: `Player${i + 1}`,
    isHost: i === 0,
  }));
}

describe('assignRoles', () => {
  test.each([5, 6, 7, 8, 9, 10])('correct good/evil counts for %d players', (count) => {
    const players = makePlayers(count);
    const { players: assigned, error } = assignRoles(players, [], count);
    expect(error).toBeUndefined();
    const evil = assigned.filter(p => p.team === 'evil').length;
    const good = assigned.filter(p => p.team === 'good').length;
    expect(evil).toBe(TEAM_COUNTS[count].evil);
    expect(good).toBe(TEAM_COUNTS[count].good);
  });

  test('always includes Merlin', () => {
    const players = makePlayers(5);
    const { players: assigned } = assignRoles(players, [], 5);
    expect(assigned.some(p => p.role === 'Merlin')).toBe(true);
  });

  test('always includes Assassin', () => {
    const players = makePlayers(5);
    const { players: assigned } = assignRoles(players, [], 5);
    expect(assigned.some(p => p.role === 'Assassin')).toBe(true);
  });

  test('includes Morgana when selected', () => {
    const players = makePlayers(7);
    const { players: assigned } = assignRoles(players, ['Morgana'], 7);
    expect(assigned.some(p => p.role === 'Morgana')).toBe(true);
  });

  test('includes Percival when selected', () => {
    const players = makePlayers(7);
    const { players: assigned } = assignRoles(players, ['Percival'], 7);
    expect(assigned.some(p => p.role === 'Percival')).toBe(true);
  });

  test('returns error for unsupported player count', () => {
    const players = makePlayers(4);
    const { error } = assignRoles(players, [], 4);
    expect(error).toBeDefined();
  });
});

describe('computeNightVision', () => {
  function setupGame(roles) {
    return roles.map((role, i) => ({
      id: `socket-${i}`,
      name: `Player${i + 1}`,
      role,
      team: ['Merlin', 'Percival', 'LoyalServant'].includes(role) ? 'good' : 'evil',
    }));
  }

  test('Merlin sees evil (not Mordred)', () => {
    const players = setupGame(['Merlin', 'Assassin', 'Morgana', 'Mordred', 'LoyalServant']);
    const merlin = players[0];
    const { sees } = computeNightVision(merlin, players);
    const names = sees.map(s => s.name);
    expect(names).toContain('Player2'); // Assassin
    expect(names).toContain('Player3'); // Morgana
    expect(names).not.toContain('Player4'); // Mordred not visible to Merlin
    expect(names).not.toContain('Player1'); // self
  });

  test('Percival sees Merlin and Morgana', () => {
    const players = setupGame(['Merlin', 'Percival', 'Morgana', 'Assassin', 'LoyalServant']);
    const percival = players[1];
    const { sees } = computeNightVision(percival, players);
    const names = sees.map(s => s.name);
    expect(names).toContain('Player1'); // Merlin
    expect(names).toContain('Player3'); // Morgana
    expect(sees.every(s => s.label === 'Merlin or Morgana')).toBe(true);
  });

  test('Assassin sees evil teammates except Oberon', () => {
    const players = setupGame(['Assassin', 'Morgana', 'Oberon', 'LoyalServant', 'LoyalServant']);
    const assassin = players[0];
    const { sees } = computeNightVision(assassin, players);
    const names = sees.map(s => s.name);
    expect(names).toContain('Player2'); // Morgana
    expect(names).not.toContain('Player3'); // Oberon not visible
    expect(names).not.toContain('Player1'); // self
  });

  test('Oberon sees nobody', () => {
    const players = setupGame(['Oberon', 'Assassin', 'LoyalServant', 'LoyalServant', 'LoyalServant']);
    const oberon = players[0];
    const { sees } = computeNightVision(oberon, players);
    expect(sees).toHaveLength(0);
  });

  test('LoyalServant sees nobody', () => {
    const players = setupGame(['LoyalServant', 'Assassin', 'Merlin', 'LoyalServant', 'LoyalServant']);
    const loyal = players[0];
    const { sees } = computeNightVision(loyal, players);
    expect(sees).toHaveLength(0);
  });
});

describe('getTeamSize', () => {
  test('returns correct team sizes for 5 players', () => {
    expect(getTeamSize(5, 1)).toBe(2);
    expect(getTeamSize(5, 2)).toBe(3);
    expect(getTeamSize(5, 3)).toBe(2);
    expect(getTeamSize(5, 4)).toBe(3);
    expect(getTeamSize(5, 5)).toBe(3);
  });

  test('returns correct team sizes for 7 players', () => {
    expect(getTeamSize(7, 1)).toBe(2);
    expect(getTeamSize(7, 4)).toBe(4);
  });

  test('returns null for unsupported player count', () => {
    expect(getTeamSize(4, 1)).toBeNull();
  });
});

describe('requiresTwoFails', () => {
  test('mission 4 with 7+ players requires two fails', () => {
    expect(requiresTwoFails(7, 4)).toBe(true);
    expect(requiresTwoFails(8, 4)).toBe(true);
    expect(requiresTwoFails(10, 4)).toBe(true);
  });

  test('mission 4 with <7 players does NOT require two fails', () => {
    expect(requiresTwoFails(5, 4)).toBe(false);
    expect(requiresTwoFails(6, 4)).toBe(false);
  });

  test('other missions never require two fails', () => {
    expect(requiresTwoFails(7, 1)).toBe(false);
    expect(requiresTwoFails(7, 2)).toBe(false);
    expect(requiresTwoFails(7, 3)).toBe(false);
    expect(requiresTwoFails(7, 5)).toBe(false);
  });
});

describe('checkWin', () => {
  test('3 successes returns good', () => {
    expect(checkWin({ missionResults: ['success', 'success', 'fail', 'success'] })).toBe('good');
  });

  test('3 failures returns evil', () => {
    expect(checkWin({ missionResults: ['fail', 'success', 'fail', 'fail'] })).toBe('evil');
  });

  test('returns null when game not over', () => {
    expect(checkWin({ missionResults: ['success', 'fail'] })).toBeNull();
    expect(checkWin({ missionResults: [] })).toBeNull();
  });
});

describe('advanceLeader', () => {
  test('rotates leader index', () => {
    const state = { leaderIndex: 0, players: [{}, {}, {}] };
    advanceLeader(state);
    expect(state.leaderIndex).toBe(1);
    advanceLeader(state);
    expect(state.leaderIndex).toBe(2);
    advanceLeader(state);
    expect(state.leaderIndex).toBe(0); // wraps around
  });
});
