const { v4: uuidv4 } = require('uuid');

// rooms: Map<roomCode, roomState>
const rooms = new Map();

const BOT_EMOJIS = ['🦁', '🐯', '🦊', '🐺', '🐻', '🐼', '🦄', '🐲', '🦅', '🦉', '🧙', '🧝', '🧛', '⚔️', '🛡️', '🎭'];

// --- Player factories ---

function makePlayer(socketId, name, isHost, avatar) {
  return { id: socketId, name, isHost, isBot: false, avatar: avatar || null };
}

function makeBot(n) {
  const emoji = BOT_EMOJIS[(n - 1) % BOT_EMOJIS.length];
  return { id: `bot-${n}`, name: `Bot ${n}`, isHost: false, isBot: true, avatar: emoji };
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(hostName, socketId, avatar) {
  const code = generateRoomCode();
  const player = makePlayer(socketId, hostName, true, avatar);
  rooms.set(code, {
    code,
    players: [player],
    phase: 'lobby',
    host: socketId,
    selectedRoles: [],
    missionResults: [],
    rejectionCount: 0,
    currentMission: 1,
    leaderIndex: 0,
    proposedTeam: [],
    votes: {},
    questCards: {},
    history: [],
  });
  return { code, player };
}

function joinRoom(roomCode, playerName, socketId, avatar) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'lobby') return { error: 'Game already in progress' };
  if (room.players.some(p => p.name === playerName)) return { error: 'Name already taken' };
  if (room.players.length >= 10) return { error: 'Room is full' };

  const player = makePlayer(socketId, playerName, false, avatar);
  room.players.push(player);
  return { room, player };
}

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

function leaveRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx === -1) continue;

    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      rooms.delete(code);
      return { code, deleted: true };
    }

    // If host left, promote next player
    if (room.host === socketId && room.players.length > 0) {
      room.host = room.players[0].id;
      room.players[0].isHost = true;
    }

    return { code, room, deleted: false };
  }
  return null;
}

function getRooms() {
  return rooms;
}

module.exports = { createRoom, joinRoom, getRoom, leaveRoom, getRooms, generateRoomCode, makePlayer, makeBot };
