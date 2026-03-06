const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { createRoom, joinRoom, getRoom, leaveRoom, makeBot, getRooms, findPlayerRoom, cleanupExpiredRooms } = require('./gameManager');
const { assignRoles, assignRolesWithForced, computeNightVision, getTeamSize, requiresTwoFails, checkWin, advanceLeader } = require('./gameLogic');

const DEV_PASSKEY = process.env.DEV_PASSKEY || 'avalon-dev';
const devAuthedSockets = new Set();

const LOG_BUFFER_MAX = 200;
const logBuffer = [];

function serverLog(category, message) {
  const entry = { ts: Date.now(), category, message };
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) logBuffer.shift();
  console.log(`[${category}] ${message}`);
  for (const sid of devAuthedSockets) {
    const s = io.sockets.sockets.get(sid);
    if (s) s.emit('server_log', entry);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// Advance leader, skipping bots
function advanceToHumanLeader(room) {
  for (let i = 0; i < room.players.length; i++) {
    advanceLeader(room);
    if (!room.players[room.leaderIndex].isBot) break;
  }
}

io.on('connection', (socket) => {
  serverLog('connect', `socket=${socket.id}`);

  // --- Room lifecycle ---

  socket.on('create_room', ({ playerName }) => {
    if (!playerName || !playerName.trim()) {
      return socket.emit('error', { message: 'Player name is required' });
    }
    const { code, player } = createRoom(playerName.trim(), socket.id);
    socket.join(code);
    serverLog('create', `"${playerName.trim()}" created room ${code}`);
    socket.emit('room_created', { code, player, room: getRoom(code) });
  });

  socket.on('join_room', ({ roomCode, playerName }) => {
    if (!playerName || !playerName.trim()) {
      return socket.emit('error', { message: 'Player name is required' });
    }
    const code = (roomCode || '').toUpperCase().trim();
    const room = getRoom(code);

    // If game is in progress, only allow re-entry for existing players
    if (room && room.phase !== 'lobby') {
      const trimmedName = playerName.trim();
      const existingPlayer = room.players.find(p => p.name === trimmedName);
      if (!existingPlayer) return socket.emit('error', { message: 'Player not found' });
      const oldId = existingPlayer.id;
      existingPlayer.id = socket.id;
      if (room.host === oldId) room.host = socket.id;
      socket.join(code);
      socket.emit('rejoined', { room, player: existingPlayer });
      if (existingPlayer.role) {
        const nightVision = computeNightVision(existingPlayer, room.players);
        socket.emit('role_assigned', { player: existingPlayer, nightVision });
      }
      return;
    }

    const result = joinRoom(code, playerName.trim(), socket.id);
    if (result.error) {
      return socket.emit('error', { message: result.error });
    }
    socket.join(code);
    serverLog('join', `"${playerName.trim()}" joined room ${code} (${result.room.players.length} players)`);
    socket.emit('room_joined', { code, player: result.player, room: result.room });
    io.to(code).emit('room_updated', { room: result.room });
  });

  socket.on('rejoin_room', ({ roomCode, playerName }) => {
    serverLog('rejoin', `attempt: player="${playerName}" room="${roomCode}"`);
    const code = (roomCode || '').toUpperCase().trim();
    const room = getRoom(code);
    if (!room) {
      serverLog('rejoin', `FAILED — room "${code}" not found`);
      return socket.emit('rejoin_failed', { reason: 'Room not found' });
    }

    const player = room.players.find(p => p.name === playerName);
    if (!player) {
      serverLog('rejoin', `FAILED — player "${playerName}" not in room "${code}"`);
      return socket.emit('rejoin_failed', { reason: 'Player not found' });
    }

    const oldId = player.id;
    player.id = socket.id;
    player.connected = true;
    delete room.emptyAt;

    if (room.host === oldId) room.host = socket.id;

    // Transfer dev auth from the old socket to the new one
    if (devAuthedSockets.has(oldId)) {
      devAuthedSockets.delete(oldId);
      devAuthedSockets.add(socket.id);
    }

    serverLog('rejoin', `SUCCESS: "${playerName}" rejoined room "${code}" (${oldId} → ${socket.id})`);
    socket.join(code);
    socket.emit('rejoined', { room, player });
    io.to(code).emit('room_updated', { room });

    if (player.role) {
      const nightVision = computeNightVision(player, room.players);
      socket.emit('role_assigned', { player, nightVision });
    }
  });

  socket.on('update_roles', ({ roomCode, selectedRoles }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can update roles' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'Cannot change roles after game has started' });
    room.selectedRoles = selectedRoles || [];
    serverLog('lobby', `room ${roomCode} roles updated: [${(selectedRoles || []).join(', ')}]`);
    io.to(roomCode).emit('room_updated', { room });
  });

  socket.on('update_settings', ({ roomCode, settings }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can update settings' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'Cannot change settings after game has started' });
    if (typeof settings.showVotingHistory === 'boolean') {
      room.showVotingHistory = settings.showVotingHistory;
    }
    io.to(roomCode).emit('room_updated', { room });
  });

  socket.on('add_bots', ({ roomCode, one }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can add bots' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'Cannot add bots after game has started' });

    let botN = room.players.filter(p => p.isBot).length;
    if (one) {
      if (room.players.length >= 10) return socket.emit('error', { message: 'Room is full' });
      botN += 1;
      room.players.push(makeBot(botN));
    } else {
      while (room.players.length < 5) {
        botN += 1;
        room.players.push(makeBot(botN));
      }
    }

    serverLog('lobby', `room ${roomCode} bots added — total players: ${room.players.length}`);
    io.to(roomCode).emit('room_updated', { room });
  });

  socket.on('reorder_players', ({ roomCode, fromIndex, toIndex }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can reorder players' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'Cannot reorder after game has started' });
    const n = room.players.length;
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) ||
        fromIndex < 0 || fromIndex >= n || toIndex < 0 || toIndex >= n || fromIndex === toIndex) return;
    const leaderName = room.players[room.leaderIndex].name;
    const [moved] = room.players.splice(fromIndex, 1);
    room.players.splice(toIndex, 0, moved);
    room.leaderIndex = room.players.findIndex(p => p.name === leaderName);
    io.to(roomCode).emit('room_updated', { room });
  });

  socket.on('verify_dev_passkey', ({ passkey }) => {
    if (passkey === DEV_PASSKEY) {
      devAuthedSockets.add(socket.id);
      serverLog('admin', `passkey auth success socket=${socket.id}`);
      socket.emit('dev_auth_result', { success: true });
      socket.emit('server_logs', { logs: [...logBuffer] });
    } else {
      serverLog('admin', `passkey auth FAILED socket=${socket.id}`);
      socket.emit('dev_auth_result', { success: false });
    }
  });

  socket.on('get_all_rooms', () => {
    if (!devAuthedSockets.has(socket.id)) {
      return socket.emit('error', { message: 'Unauthorized' });
    }
    serverLog('admin', `get_all_rooms requested socket=${socket.id}`);
    const roomSummaries = [];
    for (const [code, room] of getRooms().entries()) {
      roomSummaries.push({
        code,
        phase: room.phase,
        playerCount: room.players.length,
        playerNames: room.players.map(p => p.name),
      });
    }
    socket.emit('all_rooms', { rooms: roomSummaries });
  });

  socket.on('start_game', ({ roomCode, forcedRoles }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can start' });
    if (room.phase !== 'lobby') return socket.emit('error', { message: 'Game already started' });
    if (room.players.length < 5) return socket.emit('error', { message: 'Need at least 5 players' });

    const result = (forcedRoles && Object.keys(forcedRoles).length > 0)
      ? assignRolesWithForced(room.players, room.selectedRoles, room.players.length, forcedRoles)
      : assignRoles(room.players, room.selectedRoles, room.players.length);
    if (result.error) return socket.emit('error', { message: result.error });

    room.players = result.players;
    room.phase = 'role_reveal';
    const assignments = room.players.map(p => `${p.name}=${p.role}`).join(', ');
    serverLog('start', `room ${roomCode} started (${room.players.length} players) — ${assignments}`);
    io.to(roomCode).emit('room_updated', { room });

    // Send each non-bot player their private role info
    for (const player of room.players) {
      if (player.isBot) continue;
      const playerSocket = io.sockets.sockets.get(player.id);
      if (playerSocket) {
        const nightVision = computeNightVision(player, room.players);
        playerSocket.emit('role_assigned', { player, nightVision });
      }
    }
  });

  socket.on('advance_to_night', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can advance' });
    if (room.phase !== 'role_reveal') return;
    room.phase = 'night';
    serverLog('phase', `room ${roomCode} → night`);
    io.to(roomCode).emit('room_updated', { room });
  });

  socket.on('advance_to_team_proposal', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can advance' });
    if (room.phase !== 'night') return;
    // If current leader is a bot, advance to first human leader
    if (room.players[room.leaderIndex] && room.players[room.leaderIndex].isBot) {
      advanceToHumanLeader(room);
    }
    room.phase = 'team_proposal';
    const leader = room.players[room.leaderIndex];
    serverLog('phase', `room ${roomCode} → team_proposal, leader=${leader ? leader.name : '?'}`);
    io.to(roomCode).emit('room_updated', { room });
  });

  // --- Team proposal ---

  socket.on('propose_team', ({ roomCode, team }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.phase !== 'team_proposal') return socket.emit('error', { message: 'Not in team proposal phase' });
    const leader = room.players[room.leaderIndex];
    if (!leader || leader.id !== socket.id) return socket.emit('error', { message: 'Only the leader can propose a team' });

    const required = getTeamSize(room.players.length, room.currentMission);
    if (team.length !== required) return socket.emit('error', { message: `Team must have exactly ${required} players` });

    const playerNames = room.players.map(p => p.name);
    if (team.some(name => !playerNames.includes(name)))
      return socket.emit('error', { message: 'Team contains unknown players' });

    room.proposedTeam = team;
    room.phase = 'voting';
    room.votes = {};
    serverLog('team', `room ${roomCode} mission ${room.currentMission} — ${leader.name} proposed [${team.join(', ')}]`);
    io.to(roomCode).emit('room_updated', { room });

    // Auto-vote for bots (always approve)
    _autoBotVotes(room, roomCode);
  });

  // --- Voting ---

  socket.on('submit_vote', ({ roomCode, vote }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.phase !== 'voting') return socket.emit('error', { message: 'Not in voting phase' });

    if (typeof vote !== 'boolean')
      return socket.emit('error', { message: 'Vote must be true or false' });

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return socket.emit('error', { message: 'Player not found' });
    if (room.votes[player.name] !== undefined) return socket.emit('error', { message: 'Already voted' });

    room.votes[player.name] = vote;
    serverLog('vote', `room ${roomCode} — ${player.name} voted ${vote ? 'approve' : 'reject'}`);

    _resolveVotes(room, roomCode);
  });

  // --- Quest phase ---

  socket.on('submit_quest_card', ({ roomCode, card }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.phase !== 'quest') return socket.emit('error', { message: 'Not in quest phase' });

    if (card !== 'success' && card !== 'fail')
      return socket.emit('error', { message: 'Card must be success or fail' });

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return socket.emit('error', { message: 'Player not found' });
    if (!room.proposedTeam.includes(player.name)) return socket.emit('error', { message: 'Not on quest team' });
    if (room.questCards[player.name] !== undefined) return socket.emit('error', { message: 'Already submitted a card' });

    // Good players can only play success
    if (card === 'fail' && player.team === 'good') {
      return socket.emit('error', { message: 'Good players cannot play Fail' });
    }

    room.questCards[player.name] = card;
    serverLog('quest', `room ${roomCode} — ${player.name} played ${card}`);

    _resolveQuest(room, roomCode);
  });

  // --- Assassination ---

  socket.on('assassinate', ({ roomCode, targetName }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.phase !== 'assassination') return socket.emit('error', { message: 'Not in assassination phase' });

    const assassin = room.players.find(p => p.role === 'Assassin');
    if (!assassin || assassin.id !== socket.id) return socket.emit('error', { message: 'Only the Assassin can assassinate' });

    const target = room.players.find(p => p.name === targetName);
    if (!target) return socket.emit('error', { message: 'Target not found' });

    const merlinKilled = target.role === 'Merlin';
    room.winner = merlinKilled ? 'evil' : 'good';
    room.phase = 'game_over';
    room.gameOverAt = Date.now();
    room.assassinationTarget = targetName;
    room.gameOverReason = merlinKilled ? 'Merlin assassinated' : 'Wrong target — Good wins';
    serverLog('assassinate', `room ${roomCode} — ${assassin.name} targeted ${targetName} (${merlinKilled ? 'Merlin killed — evil wins' : 'wrong target — good wins'}`);
    room.revealedPlayers = room.players.map(p => ({
      name: p.name, role: p.role, team: p.team, isBot: p.isBot || false,
    }));

    io.to(roomCode).emit('room_updated', { room });
  });

  // --- Force advance (host only) ---

  socket.on('force_advance', ({ roomCode, targetPhase }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only host can force advance' });
    room.phase = targetPhase;
    serverLog('admin', `room ${roomCode} force_advance → ${targetPhase}`);
    io.to(roomCode).emit('room_updated', { room });
  });

  // --- Transfer host ---

  socket.on('transfer_host', ({ roomCode, targetPlayerName }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.host !== socket.id) return socket.emit('error', { message: 'Only the host can transfer host' });

    const target = room.players.find(p => p.name === targetPlayerName);
    if (!target) return socket.emit('error', { message: 'Player not found' });
    if (target.isBot) return socket.emit('error', { message: 'Cannot transfer host to a bot' });
    if (target.id === socket.id) return socket.emit('error', { message: 'You are already the host' });

    const currentHost = room.players.find(p => p.isHost);
    for (const p of room.players) {
      p.isHost = (p.name === targetPlayerName);
    }
    room.host = target.id;
    serverLog('host', `room ${roomCode} — host transferred from ${currentHost ? currentHost.name : '?'} to ${targetPlayerName}`);

    io.to(roomCode).emit('room_updated', { room });
  });

  // --- Disconnect ---

  socket.on('disconnect', () => {
    devAuthedSockets.delete(socket.id);
    const found = findPlayerRoom(socket.id);
    serverLog('disconnect', `socket=${socket.id} — ${found ? `in room ${found.code} (${found.room.phase})` : 'not in any room'}`);
    if (found) {
      const player = found.room.players.find(p => p.id === socket.id);
      if (player) {
        player.connected = false;
        serverLog('disconnect', `"${player.name}" marked offline in room ${found.code}`);

        // In lobby: if host went offline, auto-promote next connected human
        if (found.room.phase === 'lobby' && player.isHost) {
          const nextHost = found.room.players.find(
            p => !p.isBot && p.name !== player.name && p.connected !== false
          );
          if (nextHost) {
            player.isHost = false;
            nextHost.isHost = true;
            found.room.host = nextHost.id;
            serverLog('disconnect', `host auto-transferred from "${player.name}" to "${nextHost.name}" in room ${found.code}`);
          }
        }
      }

      io.to(found.code).emit('room_updated', { room: found.room });

      const activeHumans = found.room.players.filter(
        p => !p.isBot && p.id !== socket.id && io.sockets.sockets.get(p.id)
      );
      if (activeHumans.length === 0) {
        found.room.emptyAt = Date.now();
      }
    }
    // leaveRoom is no longer called — player stays in room regardless of phase
  });
});

// --- Helpers for bot auto-play ---

function _autoBotVotes(room, roomCode) {
  for (const p of room.players) {
    if (p.isBot && room.votes[p.name] === undefined) {
      room.votes[p.name] = true; // bots always approve
    }
  }
  _resolveVotes(room, roomCode);
}

function _resolveVotes(room, roomCode) {
  if (room.phase !== 'voting') return; // guard against stale calls after phase transition

  const totalPlayers = room.players.length;
  const voteCount = Object.keys(room.votes).length;

  io.to(roomCode).emit('vote_update', { voteCount, totalPlayers });

  if (voteCount === totalPlayers) {
    const approvals = Object.values(room.votes).filter(v => v).length;
    const rejected = approvals <= totalPlayers / 2;
    serverLog('vote', `room ${roomCode} vote resolved — ${approvals}/${totalPlayers} approve — ${rejected ? 'REJECTED' : 'APPROVED'}`);

    room.history.push({
      type: 'vote',
      missionNumber: room.currentMission,
      leader: room.players[room.leaderIndex].name,
      team: [...room.proposedTeam],
      votes: { ...room.votes },
      approved: !rejected,
    });

    if (rejected) {
      room.rejectionCount += 1;
      if (room.rejectionCount >= 5) {
        room.phase = 'game_over';
        room.gameOverAt = Date.now();
        room.winner = 'evil';
        room.gameOverReason = '5 team rejections';
        room.revealedPlayers = room.players.map(p => ({
          name: p.name, role: p.role, team: p.team, isBot: p.isBot || false,
        }));
      } else {
        advanceToHumanLeader(room);
        room.phase = 'team_proposal';
        room.proposedTeam = [];
        room.votes = {};
      }
    } else {
      room.rejectionCount = 0;
      room.phase = 'quest';
      room.questCards = {};

      // Auto-play bots on quest team (always success)
      _autoBotQuestCards(room, roomCode);
    }

    io.to(roomCode).emit('vote_result', { votes: room.votes, approved: !rejected, room });
    setTimeout(() => io.to(roomCode).emit('room_updated', { room }), 2000);
  }
}

function _autoBotQuestCards(room, roomCode) {
  for (const name of room.proposedTeam) {
    const p = room.players.find(pl => pl.name === name);
    if (p && p.isBot && room.questCards[p.name] === undefined) {
      room.questCards[p.name] = 'success';
    }
  }
  _resolveQuest(room, roomCode);
}

function _autoBotAssassinate(room) {
  const goodPlayers = room.players.filter(p => p.team === 'good');
  const target = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
  room.winner = target.role === 'Merlin' ? 'evil' : 'good';
  room.phase = 'game_over';
  room.gameOverAt = Date.now();
  room.assassinationTarget = target.name;
  room.gameOverReason = target.role === 'Merlin' ? 'Merlin assassinated' : 'Wrong target — Good wins';
  room.revealedPlayers = room.players.map(p => ({
    name: p.name, role: p.role, team: p.team, isBot: p.isBot || false,
  }));
}

function _resolveQuest(room, roomCode) {
  if (room.phase !== 'quest') return; // guard against stale calls after phase transition

  const cardCount = Object.keys(room.questCards).length;

  io.to(roomCode).emit('quest_update', { cardCount, teamSize: room.proposedTeam.length });

  if (cardCount === room.proposedTeam.length) {
    const fails = Object.values(room.questCards).filter(c => c === 'fail').length;
    const twoFails = requiresTwoFails(room.players.length, room.currentMission);
    const questFailed = twoFails ? fails >= 2 : fails >= 1;
    serverLog('quest', `room ${roomCode} mission ${room.currentMission} resolved — ${fails} fail(s) — ${questFailed ? 'FAILED' : 'PASSED'}`);

    room.history.push({
      type: 'quest',
      missionNumber: room.currentMission,
      team: [...room.proposedTeam],
      result: questFailed ? 'fail' : 'success',
      failCount: fails,
    });

    room.missionResults.push(questFailed ? 'fail' : 'success');
    room.currentMission += 1;

    const winResult = checkWin(room);
    if (winResult === 'good') {
      room.phase = 'assassination';
      room.winner = null;
      const assassin = room.players.find(p => p.role === 'Assassin');
      if (assassin && assassin.isBot) {
        _autoBotAssassinate(room);
      }
    } else if (winResult === 'evil') {
      room.phase = 'game_over';
      room.gameOverAt = Date.now();
      room.winner = 'evil';
      room.gameOverReason = '3 mission failures';
      room.revealedPlayers = room.players.map(p => ({
        name: p.name, role: p.role, team: p.team, isBot: p.isBot || false,
      }));
    } else {
      advanceToHumanLeader(room);
      room.phase = 'team_proposal';
      room.proposedTeam = [];
      room.questCards = {};
      room.votes = {};
    }

    io.to(roomCode).emit('quest_result', {
      fails,
      questFailed,
      missionResults: room.missionResults,
      room,
    });
    setTimeout(() => io.to(roomCode).emit('room_updated', { room }), 2000);
  }
}

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const ROOM_TTL_MS = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const n = cleanupExpiredRooms(ROOM_TTL_MS);
  if (n > 0) serverLog('cleanup', `Removed ${n} expired room(s)`);
}, 60_000); // sweep every minute

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Avalon server running on port ${PORT}`);
  // startup log goes to console only (io not ready for broadcast yet)
});

module.exports = { app, server, io };
