const { createRoom, joinRoom, getRoom, leaveRoom, getRooms } = require('../gameManager');

// Reset rooms between tests
beforeEach(() => {
  const rooms = getRooms();
  rooms.clear();
});

describe('createRoom', () => {
  test('returns a unique 4-char uppercase room code', () => {
    const { code } = createRoom('Alice', 'socket-1');
    expect(code).toMatch(/^[A-Z]{4}$/);
  });

  test('adds host player to room', () => {
    const { code, player } = createRoom('Alice', 'socket-1');
    const room = getRoom(code);
    expect(room.players).toHaveLength(1);
    expect(player.name).toBe('Alice');
    expect(player.isHost).toBe(true);
  });

  test('generates unique codes for multiple rooms', () => {
    const codes = new Set();
    for (let i = 0; i < 10; i++) {
      const { code } = createRoom(`Player${i}`, `socket-${i}`);
      codes.add(code);
    }
    expect(codes.size).toBe(10);
  });
});

describe('joinRoom', () => {
  test('adds player to existing room', () => {
    const { code } = createRoom('Alice', 'socket-1');
    const result = joinRoom(code, 'Bob', 'socket-2');
    expect(result.error).toBeUndefined();
    const room = getRoom(code);
    expect(room.players).toHaveLength(2);
    expect(room.players[1].name).toBe('Bob');
  });

  test('returns error for nonexistent room', () => {
    const result = joinRoom('ZZZZ', 'Bob', 'socket-2');
    expect(result.error).toBe('Room not found');
  });

  test('returns error for duplicate name', () => {
    const { code } = createRoom('Alice', 'socket-1');
    const result = joinRoom(code, 'Alice', 'socket-2');
    expect(result.error).toBe('Name already taken');
  });

  test('returns error when game is in progress', () => {
    const { code } = createRoom('Alice', 'socket-1');
    const room = getRoom(code);
    room.phase = 'role_reveal';
    const result = joinRoom(code, 'Bob', 'socket-2');
    expect(result.error).toBe('Game already in progress');
  });
});

describe('leaveRoom', () => {
  test('removes player from room', () => {
    const { code } = createRoom('Alice', 'socket-1');
    joinRoom(code, 'Bob', 'socket-2');
    leaveRoom('socket-2');
    const room = getRoom(code);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].name).toBe('Alice');
  });

  test('deletes room when last player leaves', () => {
    const { code } = createRoom('Alice', 'socket-1');
    const result = leaveRoom('socket-1');
    expect(result.deleted).toBe(true);
    expect(getRoom(code)).toBeNull();
  });

  test('promotes next player as host when host leaves', () => {
    const { code } = createRoom('Alice', 'socket-1');
    joinRoom(code, 'Bob', 'socket-2');
    leaveRoom('socket-1');
    const room = getRoom(code);
    expect(room.players[0].name).toBe('Bob');
    expect(room.players[0].isHost).toBe(true);
    expect(room.host).toBe('socket-2');
  });

  test('returns null for unknown socket', () => {
    const result = leaveRoom('unknown-socket');
    expect(result).toBeNull();
  });
});
