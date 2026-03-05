const { v4: uuidv4 } = require('uuid');

// rooms: Map<roomCode, roomState>
const rooms = new Map();

// --- Player factories ---

function makePlayer(socketId, name, isHost) {
  return { id: socketId, name, isHost, isBot: false, connected: true };
}

function makeBot(n) {
  return { id: `bot-${n}`, name: `Bot ${n}`, isHost: false, isBot: true, connected: true };
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(hostName, socketId) {
  const code = generateRoomCode();
  const player = makePlayer(socketId, hostName, true);
  rooms.set(code, {
    code,
    players: [player],
    phase: 'lobby',
    host: socketId,
    selectedRoles: [],
    showVotingHistory: true,
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

function joinRoom(roomCode, playerName, socketId) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'lobby') return { error: 'Game already in progress' };
  if (room.players.some(p => p.name === playerName)) return { error: 'Name already taken' };
  if (room.players.length >= 10) return { error: 'Room is full' };

  const player = makePlayer(socketId, playerName, false);
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

function findPlayerRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    if (room.players.some(p => p.id === socketId)) {
      return { code, room };
    }
  }
  return null;
}

function deleteRoom(roomCode) {
  rooms.delete(roomCode);
}

function cleanupExpiredRooms(ttlMs) {
  const now = Date.now();
  let count = 0;
  for (const [code, room] of rooms) {
    if (room.gameOverAt && now - room.gameOverAt > ttlMs) {
      rooms.delete(code); count++;
    } else if (room.emptyAt && now - room.emptyAt > ttlMs) {
      rooms.delete(code); count++;
    }
  }
  return count;
}

module.exports = { createRoom, joinRoom, getRoom, leaveRoom, getRooms, generateRoomCode, makePlayer, makeBot, findPlayerRoom, deleteRoom, cleanupExpiredRooms };
